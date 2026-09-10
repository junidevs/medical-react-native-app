import { SignJWT, exportJWK, importJWK } from "jose";

const keyId = "medconnect-dev-key";

const publicJwk = {
  kty: "RSA",
  n: "uJaZy5IcZBx06XHmNSIupoFV5DZMrWUKReGuYTUX4eyzPBHXtejzv8zN8GmDyS6RynO_0IOHczfRUTD4eabE8mweREbib4B-MK9Wu8n5qBwicwuVB9LqWc1Hua5sJsoA3xPdJnflf0cOxqcc70mTtOhUAhFFdAOAcJfWNF6YqOtTMEJAyajqkovoXEqiTovfpO2-x-dNDWf_aVqXNFeblXgwn2fRarXRleDvTq-z9SJ466-rCe4jIL3PCCu5dRtiMgP64yh9C9U7Z_Xpqwpim5kHnlR1cSAuk9jdgAp1OK6bbkeCqOw_X75T0t7oHFu90-pfS-mLVbCL-O0puqD-hQ",
  e: "AQAB",
  kid: keyId,
  use: "sig",
  alg: "RS256"
} as const;

// TEST ONLY. This key is intentionally committed so local mock tokens can be
// signed and verified without Azure credentials. Never use it outside dev/test.
const privateJwk = {
  kty: "RSA",
  n: "uJaZy5IcZBx06XHmNSIupoFV5DZMrWUKReGuYTUX4eyzPBHXtejzv8zN8GmDyS6RynO_0IOHczfRUTD4eabE8mweREbib4B-MK9Wu8n5qBwicwuVB9LqWc1Hua5sJsoA3xPdJnflf0cOxqcc70mTtOhUAhFFdAOAcJfWNF6YqOtTMEJAyajqkovoXEqiTovfpO2-x-dNDWf_aVqXNFeblXgwn2fRarXRleDvTq-z9SJ466-rCe4jIL3PCCu5dRtiMgP64yh9C9U7Z_Xpqwpim5kHnlR1cSAuk9jdgAp1OK6bbkeCqOw_X75T0t7oHFu90-pfS-mLVbCL-O0puqD-hQ",
  e: "AQAB",
  d: "H9_Ll2I32laqnowPPUIVjaV8RC_XLkLqEvadQsZlBRt3OMp49f3Pp2FRd2_09IbA4JV7vCEWQOBU2gELixAv5o-ia1ZVL_1fbP8-CifenzeagESx-5uhYZfnyIm0vb74hwzaTZP7Em8d_1Ioli5dnenXZdL_LAEVyvuBHuJt2I8dJzC-3hZkH8iEKHvgrdb7ZP0EeGY2fh910qRcNqJjSr0O-qvTsS839uobDEHBljqjOEhfrFGy47Xm384bYiGgQ-GLA8jkpNx1Te_iPgrLRfan6n8WSdb8vdlyngANlWCGd12gvL-mzzxY0GfpSAKCcps1viQFP_bFHCcbVSe0GQ",
  p: "2n0dYTOTK4195UiEHLukQWHm_kxmomOBhuMlGWzcwp-Vx1n3GyfKC8rtJz42lmGUlM6WnnYp3fLhOWJRMlsiEoZ8wfti5t3QYyIXKzTBxYBUrX59r0mmxu0Zd7Ssbnw-kdPbA7gt18ibtvGsn-4qQHLNgttSQx6r26dRqFYRuo0",
  q: "2EeDlm1PTplc2URxyMKMHA9LGmpZ-yA1_1EbXH32we3aAKGNl1fr18BI47R_ythHSQ65vDGPHd74BERlS0eUCa9jtYqf-YEZYCZ9c4N6CjKeleug_EE47qdNoUopY-XiFLOSKejbakpfL5t0lLLq3HuDkLw4LFQtQLZnOOKwkdk",
  dp: "JIx3ZLIu9UMnAzrdNr1A3dsVvAZlyNZibYEDzLwENd5iPMXU60r9pnlcsIrcsM1EAJyKX5meqU0e1e2XbZgHHBg5OG3n_nyuhlbGj2i03Wf5Qkh9l9v3NSGmd_rWOWk5QkWxRm8B5C3ftnu5B8vcb4mEzVYI7cdsskLMCx_SuWU",
  dq: "WULqpCLpIF9bWrBM5balbM9DB9vs1yAsKPuodzvlo5Qu7SO_9D5tL9ZEPvY359frU9OoBGvPzVxAsEIqLC-WgYjJdhuIesk1V-GK1SnmLF9H5EgjYPjqLlUOTQr2miw-apzSLknUhMG9F0DplJVjKSww2INWC7WSF6swXuHwTcE",
  qi: "FN1CohP3IQ9xIivalAV4LgrNrcX_vw3MS03l_h0EZos0EviBABBzUjaCQtOIYJoSF0SyJtciHkb_f0XthYkOM9Oi8UA_1-QmCLAKcDKMMFlliZhtSnv27OiEMbLpjuOi4P0azwLO74p_euEKHoO5tonhUWY4_wtMyJRaDuZnfbA",
  kid: keyId,
  use: "sig",
  alg: "RS256"
} as const;

export interface MockTokenInput {
  issuer: string;
  audience: string;
  subject?: string;
  email?: string;
  name?: string;
  expiresInSeconds?: number;
}

export function getMockJwks() {
  return { keys: [publicJwk] };
}

export async function mintMockAccessToken(input: MockTokenInput) {
  const subject = input.subject ?? "11111111-1111-1111-1111-111111111111";
  const expiresInSeconds = input.expiresInSeconds ?? 900;
  const key = await importJWK(privateJwk, "RS256");

  return new SignJWT({
    aud: input.audience,
    iss: input.issuer,
    oid: subject,
    sub: subject,
    tid: "22222222-2222-2222-2222-222222222222",
    scp: "access_as_user",
    email: input.email ?? "patient.demo@medconnect.local",
    name: input.name ?? "Demo Patient"
  })
    .setProtectedHeader({ alg: "RS256", kid: keyId, typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(key);
}

export async function exportMockPublicJwk() {
  const key = await importJWK(publicJwk, "RS256");
  return exportJWK(key);
}

