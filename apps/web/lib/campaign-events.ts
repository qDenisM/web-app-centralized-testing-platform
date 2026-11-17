export const CAMPAIGN_CHANGED_EVENT = "abiturent:campaign-changed";

export type CampaignChangedDetail = {
  year: number | null;
  id?: string;
};

export function notifyCampaignChanged(detail: CampaignChangedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CampaignChangedDetail>(CAMPAIGN_CHANGED_EVENT, { detail }),
  );
}
