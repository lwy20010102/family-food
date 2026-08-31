from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
import re

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.daily_menu import DailyMenu, DailyMenuItem
from app.models.family import Family
from app.models.shopping_list import ShoppingList, ShoppingListItem

AMOUNT_PATTERN = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*(.*\S)?\s*$")


@dataclass
class ShoppingListEntry:
    name: str
    unit: str
    numeric_total: Decimal | None = None
    text_amounts: list[str] = field(default_factory=list)


def _today() -> date:
    return datetime.now().date()


def _load_shopping_list_query():
    return select(ShoppingList).options(selectinload(ShoppingList.items))


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().split())


def _normalize_key(value: str) -> str:
    return _normalize_text(value).casefold()


def _parse_amount(amount: str, unit: str) -> tuple[Decimal | None, str, str | None]:
    amount_text = _normalize_text(amount)
    unit_text = _normalize_text(unit)

    if not amount_text:
        return None, unit_text, None

    match = AMOUNT_PATTERN.match(amount_text.replace(",", ""))
    if match is None:
        return None, unit_text, amount_text

    try:
        numeric = Decimal(match.group(1))
    except InvalidOperation:
        return None, unit_text, amount_text

    suffix = _normalize_text(match.group(2) or "")
    if not unit_text and suffix:
        unit_text = suffix

    return numeric, unit_text, None


def _format_amount(value: Decimal) -> str:
    normalized = value.normalize()
    if normalized == normalized.to_integral():
        return str(int(normalized))
    return format(normalized, "f").rstrip("0").rstrip(".")


def load_today_shopping_list(db: Session, family_id: int) -> ShoppingList | None:
    statement = _load_shopping_list_query().where(
        ShoppingList.family_id == family_id,
        ShoppingList.menu_date == _today(),
    )
    return db.execute(statement).unique().scalar_one_or_none()


def load_shopping_list_item_by_id(
    db: Session,
    family_id: int,
    item_id: int,
) -> ShoppingListItem | None:
    statement = (
        select(ShoppingListItem)
        .join(ShoppingList)
        .where(
            ShoppingList.family_id == family_id,
            ShoppingList.menu_date == _today(),
            ShoppingListItem.id == item_id,
        )
    )
    return db.execute(statement).unique().scalar_one_or_none()


def _aggregate_menu_items(menu: DailyMenu) -> list[ShoppingListEntry]:
    aggregated: dict[tuple[str, str], ShoppingListEntry] = {}

    for menu_item in menu.items:
        for ingredient in menu_item.recipe.ingredients:
            name = ingredient.name.strip()
            if not name:
                continue

            numeric_amount, unit_text, text_amount = _parse_amount(
                ingredient.amount,
                ingredient.unit,
            )
            key = (_normalize_key(name), _normalize_key(unit_text))
            entry = aggregated.get(key)
            if entry is None:
                entry = ShoppingListEntry(name=name, unit=unit_text)
                aggregated[key] = entry

            if numeric_amount is not None:
                entry.numeric_total = (
                    numeric_amount
                    if entry.numeric_total is None
                    else entry.numeric_total + numeric_amount
                )
            elif text_amount:
                entry.text_amounts.append(text_amount)

    return sorted(
        aggregated.values(),
        key=lambda item: (item.name.casefold(), item.unit.casefold()),
    )


def rebuild_today_shopping_list(
    db: Session,
    family: Family,
    menu: DailyMenu,
) -> ShoppingList:
    existing = load_today_shopping_list(db, family.id)
    if existing is not None:
        db.delete(existing)
        db.flush()

    shopping_list = ShoppingList(
        family_id=family.id,
        menu_date=menu.menu_date,
    )
    db.add(shopping_list)
    db.flush()

    entries = _aggregate_menu_items(menu)
    for entry in entries:
        if entry.numeric_total is not None:
            amount = _format_amount(entry.numeric_total)
        elif entry.text_amounts:
            seen: set[str] = set()
            unique_amounts: list[str] = []
            for item in entry.text_amounts:
                if item in seen:
                    continue
                seen.add(item)
                unique_amounts.append(item)
            amount = "、".join(unique_amounts)
        else:
            amount = ""

        db.add(
            ShoppingListItem(
                shopping_list_id=shopping_list.id,
                name=entry.name,
                amount=amount,
                unit=entry.unit,
                is_purchased=False,
            )
        )

    db.flush()
    return load_today_shopping_list(db, family.id) or shopping_list


def set_shopping_list_item_purchase_state(
    db: Session,
    item: ShoppingListItem,
    is_purchased: bool,
) -> ShoppingListItem:
    item.is_purchased = is_purchased
    db.commit()
    return load_shopping_list_item_by_id(
        db,
        item.shopping_list.family_id,
        item.id,
    ) or item


def reset_today_shopping_list(
    db: Session,
    family_id: int,
) -> ShoppingList | None:
    shopping_list = load_today_shopping_list(db, family_id)
    if shopping_list is None:
        return None

    for item in shopping_list.items:
        item.is_purchased = False

    db.commit()
    return load_today_shopping_list(db, family_id) or shopping_list
