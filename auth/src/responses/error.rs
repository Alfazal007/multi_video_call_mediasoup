use serde::Serialize;

#[derive(Serialize)]
pub struct GeneralError {
    pub errors: String,
}

#[derive(Serialize)]
pub struct ValidationErrors {
    pub errors: Vec<String>,
}
