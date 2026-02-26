import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROTOCOL_TYPE_LABELS, TRIGGER_TYPE_LABELS } from '@/lib/constants/ranges';
import type { ExtractedProtocolData } from '@/types/protocol';

interface ProtocolSummaryCardProps {
  data: ExtractedProtocolData;
}

export function ProtocolSummaryCard({ data }: ProtocolSummaryCardProps) {
  const hasAnyData =
    data.age || data.protocolType || data.medications.length > 0 || (data.supplements && data.supplements.length > 0);

  if (!hasAnyData) return null;

  const supplements = data.supplements || [];

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
          {!data.isComplete && data.missingRequired.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              Needs: {data.missingRequired.join(', ')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {data.age && (
          <Row label="Age" value={data.ageMonths != null ? `${data.age} yr ${data.ageMonths} mo` : String(data.age)} />
        )}
        {data.amhRange && data.amhRange !== 'unknown' && (
          <Row label="AMH" value={`${data.amhRange} ng/mL`} />
        )}
        {data.afcRange && data.afcRange !== 'unknown' && (
          <Row label="AFC" value={data.afcRange} />
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
