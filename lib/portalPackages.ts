export type PackageValue = string | number | boolean | null | undefined;
export type PortalPackageDataset = {
  selectedRecordId:string; packageType:"teaser"|"underwriting"|"loi"; generatedAt:string;
  asset:{name?:string;registryId?:string;type?:string;pillar?:string;locationMarket?:string;askingPriceValue?:PackageValue;revenuePotential?:string;dealType?:string;founderApproval?:PackageValue;revealStage?:string};
  investor:{name?:string;organization?:string;registryName?:string;capitalCapacity?:PackageValue;minCheckLoan?:PackageValue;maxCheckLoan?:PackageValue;ndaStatus?:string;proofOfFundsStatus?:string};
  partnerSubmission:{sourcePartner?:string;submissionStatus?:string;documentsReceived?:string[];dataCompleteness?:string;noiIncome?:PackageValue;capRateYield?:PackageValue};
  underwriting:{records?:Array<{id:string;title:string;fields:Record<string,string>}>;noiT12?:PackageValue;noiT3?:PackageValue;rentRoll?:PackageValue;expenses?:PackageValue;capRate?:PackageValue;valuationMethod?:string;valuationOutput?:PackageValue;dscr?:PackageValue;equityRequired?:PackageValue;debtRequired?:PackageValue;targetLtvLtc?:PackageValue;loanAmount?:PackageValue;rateTerms?:string;packageReadyStatus?:string;dataCompleteness?:string};
  buyBoxMatch:{investorFit?:string;capitalFit?:string;dealFit?:string;geographyFit?:string;nextStep?:string;criteria?:Record<string,unknown>};
  loi:{proposedOfferAmount?:PackageValue;deposit?:string;dueDiligencePeriod?:string;closingTimeline?:string;financing?:string};
  registryIds:{teaser:string;underwriting:string;loi:string};
};
const positive=(value:PackageValue)=>/yes|true|approved|ready|complete|completed|signed|received|verified|on file/i.test(String(value||""));
type PackageGateContext={walkthrough?:boolean};
export const canViewTeaser=(data:PortalPackageDataset,context:PackageGateContext={})=>Boolean(context.walkthrough)||/teaser|full|underwriting|approved/i.test(data.asset.revealStage||"");
export const canViewUnderwriting=(data:PortalPackageDataset,context:PackageGateContext={})=>positive(data.investor.ndaStatus)&&(Boolean(context.walkthrough)||(positive(data.underwriting.packageReadyStatus)&&positive(data.asset.founderApproval)&&positive(data.underwriting.dataCompleteness)));
export const canGenerateLoi=(data:PortalPackageDataset,context:PackageGateContext={})=>positive(data.investor.ndaStatus)&&(Boolean(context.walkthrough)||(positive(data.investor.proofOfFundsStatus)&&positive(data.asset.founderApproval)));
const token=(value="")=>value.replace(/[^a-z0-9]/gi,"").slice(0,10).toUpperCase()||"ASSET";
export function packageRegistryIds(assetId:string,investorId="BRUCE") {const date=new Date().toISOString().slice(0,10);const asset=token(assetId);return{teaser:`SBF-TEAS-${asset}-${date}`,underwriting:`SBF-UW-${asset}-${date}`,loi:`SBF-LOI-${asset}-${token(investorId)}-${date}`};}
