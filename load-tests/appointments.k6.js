import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"]
  }
};

const apiUrl = __ENV.API_URL ?? "http://localhost:4000";
const token = __ENV.ACCESS_TOKEN ?? "";

export default function run() {
  const response = http.get(`${apiUrl}/appointments`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  check(response, {
    "appointments status is 200": (result) => result.status === 200
  });
  sleep(1);
}

