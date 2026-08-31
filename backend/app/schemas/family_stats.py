from pydantic import BaseModel, Field


class FamilyStatsRecipe(BaseModel):
    recipe_id: int
    title: str
    category: str
    image_url: str | None
    count: int


class FamilyStatsOrderer(BaseModel):
    user_id: int
    username: str
    count: int


class FamilyMonthlyStats(BaseModel):
    month: str
    completed_meals: int = 0
    dishes_made: int = 0
    total_orders: int = 0
    top_recipes: list[FamilyStatsRecipe] = Field(default_factory=list)
    top_orderers: list[FamilyStatsOrderer] = Field(default_factory=list)


class FamilyMonthlyStatsResponse(BaseModel):
    stats: FamilyMonthlyStats
