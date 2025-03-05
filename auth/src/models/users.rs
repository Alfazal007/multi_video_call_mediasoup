use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Deserialize, FromRow, Serialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub password: String,
}

#[derive(Deserialize, FromRow, Serialize)]
pub struct UserWithoutPassword {
    pub id: i32,
    pub username: String,
}
