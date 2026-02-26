import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PROTOCOL_TYPE_LABELS,
  TRIGGER_TYPE_LABELS,
  CYCLE_TYPE_LABELS,
  FERTILIZATION_METHOD_LABELS,
  DIAGNOSIS_LABELS,
} from '@/lib/constants/ranges';
import type { ExtractedProtocolData } from '@/types/protocol';

interface ProtocolSummaryCardProps {
  data: ExtractedProtocolData;
}

export function ProtocolSummaryCard({ data }: ProtocolSummaryCardProps) {
  const hasAnyData =
    data.age || data.protocolType || data.medications.length > 0 || (data.supplements && data.supplements.length > 0);

  if (!hasAnyData) return null;

  const supplements = data.supplements || [];
  const canSubmit = data.age != null && (data.medications.length > 0 || supplements.length > 0);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Protocol Summary
          {data.isComplete && (
            <Badge variant="default" className="text-[10px]">
              Ready to submit
            </Badge>
          )}
          {!data.isComplete && canSubmit && (
            <Badge className="text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-100">
              Can submit — more details help
            </Badge>
          )}
          {!data.isComplete && !canSubmit && (
            <Badge variant="secondary" className="text-[10px]">
              Needs: age + at least one medication
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {data.age && (
          <Row label="Age" value={data.ageMonths != null ? `${data.age} yr ${data.ageMonths} mo` : String(data.age)} />
        )}
        {data.cycleNumber && (
          <Row label="Cycle #" value={String(data.cycleNumber)} />
        )}
        {data.diagnoses && data.diagnoses.length > 0 && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-20 shrink-0">Dx</span>
            <div className="flex flex-wrap gap-1">
              {data.diagnoses.map((dx, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">
                  {DIAGNOSIS_LABELS[dx] || dx}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {data.amhValue != null && (
          <Row label="AMH" value={`${data.amhValue} ng/mL`} />
        )}
        {!data.amhValue && data.amhRange && data.amhRange !== 'unknown' && (
          <Row label="AMH" value={`${data.amhRange} ng/mL`} />
        )}
        {data.afcCount != null && (
          <Row label="AFC" value={String(data.afcCount)} />
        )}
        {!data.afcCount && data.afcRange && data.afcRange !== 'unknown' && (
          <Row label="AFC" value={data.afcRange} />
        )}
        {data.maxFollicles != null && (
          <Row label="Follicles" value={String(data.maxFollicles)} />
        )}
        {data.country && (
          <Row label="Location" value={data.state ? `${data.state}, ${data.country}` : data.country} />
        )}
        {data.protocolType && (
          <Row
            label="Protocol"
            value={PROTOCOL_TYPE_LABELS[data.protocolType] || data.protocolType}
          />
        )}
        {data.cycleType && (
          <Row label="Cycle Type" value={CYCLE_TYPE_LABELS[data.cycleType] || data.cycleType} />
        )}
        {data.fertilizationMethod && (
          <Row label="Fert." value={FERTILIZATION_METHOD_LABELS[data.fertilizationMethod] || data.fertilizationMethod} />
        )}
        {data.donorSperm === true && <Row label="Donor" value="Donor sperm" />}
        {data.donorEggs === true && <Row label="Donor" value="Donor eggs" />}
        {data.partnerAge && (
          <Row label="Partner Age" value={String(data.partnerAge)} />
        )}
        {data.medications.length > 0 && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-20 shrink-0">Meds</span>
            <div className="flex flex-wrap gap-1">
              {data.medications.map((med, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">
                  {med.name} {med.dosage && `(${med.dosage})`}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {supplements.length > 0 && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-20 shrink-0">Suppl.</span>
            <div className="flex flex-wrap gap-1">
              {supplements.map((sup, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {sup.name} {sup.dosage && `(${sup.dosage})`}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {data.triggerType && data.triggerType !== 'unknown' && (
          <Row
            label="Trigger"
            value={TRIGGER_TYPE_LABELS[data.triggerType] || data.triggerType}
          />
        )}
        {data.stimDays && (
          <Row label="Stim Days" value={String(data.stimDays)} />
        )}
        {data.peakE2 != null && (
          <Row label="Peak E2" value={`${data.peakE2} pg/mL`} />
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
