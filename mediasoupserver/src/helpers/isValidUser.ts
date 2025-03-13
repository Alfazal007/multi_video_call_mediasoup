import axios from "axios";

export async function isValidUser(accessToken: string): Promise<boolean> {
    try {
        const response = await axios.post("http://localhost:8000/api/v1/user/isValidUser", {
            access_token: accessToken
        });

        if (response.status == 200) {
            return true;
        }
        return false;
    } catch (err) {
        console.log({ err });
        return false;
    }
}



