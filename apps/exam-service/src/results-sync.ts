import { AppError } from "@abiturent/service-kit";
import { config } from "./config.js";

/** Best-effort CT result row ensure/retract in results-service. */
async function postInternal(
  path: string,
  body: Record<string, unknown>,
  options?: { required?: boolean },
): Promise<unknown | null> {
  if (!config.resultsUrl) {
    if (options?.required) {
      throw AppError.badRequest("Сервис результатов ЦТ недоступен");
    }
    return null;
  }

  try {
    const res = await fetch(`${config.resultsUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-internal-token": config.internalAuditToken,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (options?.required) {
        throw AppError.badRequest(
          "Не удалось проверить результаты ЦТ. Попробуйте позже",
        );
      }
      return null;
    }
    return (await res.json().catch(() => null)) as unknown;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (options?.required) {
      throw AppError.badRequest(
        "Не удалось проверить результаты ЦТ. Попробуйте позже",
      );
    }
    // results sync must not break moderator decide
    return null;
  }
}

export async function ensureCtResultRow(input: {
  examId: string;
  userId: string;
  subjectId?: string;
  campaignYear?: number;
}): Promise<void> {
  await postInternal("/internal/results/ensure", input);
}

export async function retractCtResultIfPublished(input: {
  examId: string;
  userId: string;
}): Promise<void> {
  await postInternal("/internal/results/retract", input);
}

/** True when applicant already has a published/scored CT result for subject+year. */
export async function hasMeaningfulCtResult(input: {
  userId: string;
  subjectId: string;
  campaignYear: number;
}): Promise<boolean> {
  const data = (await postInternal("/internal/results/exists", input, {
    required: true,
  })) as { exists?: boolean } | null;
  return Boolean(data?.exists);
}
