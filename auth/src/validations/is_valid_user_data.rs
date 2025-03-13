use validator::Validate;

#[derive(Validate, serde::Deserialize)]
pub struct IsValidUserData {
    pub access_token: String,
}
