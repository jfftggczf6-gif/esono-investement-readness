import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const YEAR_KEYS = ['year_minus_2', 'year_minus_1', 'current_year', 'year2', 'year3', 'year4', 'year5', 'year6'] as const;

const fmt = (n: any) => {
  const v = Number(n);
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(Math.round(v));
};

const pct = (n: any) => {
  const v = Number(n);
  if (isNaN(v)) return '—';
  return `${v.toFixed(1)}%`;
};

function yearLabel(key: string, years: any): string {
  if (years?.[key]) return String(years[key]);
  const map: Record<string, string> = {
    year_minus_2: 'N-2', year_minus_1: 'N-1', current_year: 'N',
    year2: 'N+1', year3: 'N+2', year4: 'N+3', year5: 'N+4', year6: 'N+5',
  };
  return map[key] || key;
}

function getYearSeries(obj: any): number[] {
  if (!obj) return YEAR_KEYS.map(() => 0);
  return YEAR_KEYS.map(k => Number(obj[k]) || 0);
}

// ===== KPI Card =====
function KpiCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="py-3 px-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{icon} {label}</p>
        <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
        <p className="text-[9px] text-muted-foreground">FCFA</p>
      </CardContent>
    </Card>
  );
}

export default function PlanOvoViewer({ data }: { data: any }) {
  const years = data.years || {};
  const labels = YEAR_KEYS.map(k => yearLabel(k, years));
  const revSeries = getYearSeries(data.revenue);
  const cogsSeries = getYearSeries(data.cogs);
  const gpSeries = getYearSeries(data.gross_profit);
  const gpPctSeries = getYearSeries(data.gross_margin_pct);
  const ebitdaSeries = getYearSeries(data.ebitda);
  const ebitdaPctSeries = getYearSeries(data.ebitda_margin_pct);
  const npSeries = getYearSeries(data.net_profit);
  const cfSeries = getYearSeries(data.cashflow);

  // Chart data
  const chartData = YEAR_KEYS.map((k, i) => ({
    name: labels[i],
    Revenue: revSeries[i],
    EBITDA: ebitdaSeries[i],
    'Net Profit': npSeries[i],
    Cashflow: cfSeries[i],
  }));

  const opex = data.opex || {};
  const opexLabels: Record<string, string> = {
    staff_salaries: 'Salaires', marketing: 'Marketing', office_costs: 'Bureaux',
    travel: 'Déplacements', insurance: 'Assurances', maintenance: 'Maintenance',
    third_parties: 'Prestataires', other: 'Autres',
  };

  const summaryRows = [
    { label: 'Chiffre d\'affaires', values: revSeries, bold: true },
    { label: 'Coûts directs (COGS)', values: cogsSeries },
    { label: 'Marge brute', values: gpSeries, bold: true },
    { label: 'Marge brute %', values: gpPctSeries, isPct: true },
    { label: 'EBITDA', values: ebitdaSeries, bold: true },
    { label: 'Marge EBITDA %', values: ebitdaPctSeries, isPct: true },
    { label: 'Résultat net', values: npSeries, bold: true },
    { label: 'Cash-Flow', values: cfSeries },
  ];

  const currentIdx = 2; // current_year index

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Plan Financier OVO</h3>
          <p className="text-xs text-muted-foreground">
            {data.company || '—'} • {data.country || 'Côte d\'Ivoire'} • {data.currency || 'XOF'}
          </p>
        </div>
        {data.score != null && (
          <div className="text-center">
            <Badge variant={data.score >= 70 ? 'default' : data.score >= 40 ? 'secondary' : 'destructive'} className="text-sm px-3 py-1">
              {data.score}/100
            </Badge>
            <Progress value={data.score} className="w-24 h-1.5 mt-1" />
          </div>
        )}
      </div>

      {/* KPI Bar */}
      <div className="flex flex-wrap gap-3">
        <KpiCard label="Revenue" value={fmt(revSeries[currentIdx])} icon="💰" />
        <KpiCard label="Marge brute" value={fmt(gpSeries[currentIdx])} icon="📊" />
        <KpiCard label="EBITDA" value={fmt(ebitdaSeries[currentIdx])} icon="📈" />
        <KpiCard label="Résultat net" value={fmt(npSeries[currentIdx])} icon="🎯" />
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">📋 Compte de résultat prévisionnel</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs min-w-[140px]">Poste</TableHead>
                  {labels.map((l, i) => (
                    <TableHead key={i} className="text-xs text-right min-w-[90px]">{l}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryRows.map((row, ri) => (
                  <TableRow key={ri} className={row.bold ? 'bg-muted/30' : ''}>
                    <TableCell className={`text-xs ${row.bold ? 'font-semibold' : 'text-muted-foreground pl-6'}`}>
                      {row.label}
                    </TableCell>
                    {row.values.map((v, ci) => (
                      <TableCell key={ci} className={`text-xs text-right ${row.bold ? 'font-semibold' : ''}`}>
                        {row.isPct ? pct(v) : fmt(v)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Revenue vs EBITDA Chart */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">📊 Revenue vs EBITDA</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => fmt(v) + ' FCFA'} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="EBITDA" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Net Profit & Cashflow Line Chart */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">📈 Résultat net & Cash-Flow</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => fmt(v) + ' FCFA'} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Net Profit" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Cashflow" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* OPEX Detail */}
      {Object.keys(opex).length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">🏢 Charges d'exploitation (OPEX)</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[120px]">Poste</TableHead>
                    {labels.map((l, i) => (
                      <TableHead key={i} className="text-xs text-right min-w-[80px]">{l}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(opexLabels).map(([key, label]) => {
                    const row = opex[key];
                    if (!row) return null;
                    const vals = getYearSeries(row);
                    if (vals.every(v => v === 0)) return null;
                    return (
                      <TableRow key={key}>
                        <TableCell className="text-xs text-muted-foreground">{label}</TableCell>
                        {vals.map((v, i) => (
                          <TableCell key={i} className="text-xs text-right">{fmt(v)}</TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff */}
      {data.staff?.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">👥 Personnel</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Catégorie</TableHead>
                  <TableHead className="text-xs">Département</TableHead>
                  <TableHead className="text-xs text-right">Charges sociales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.staff.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{s.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.department}</TableCell>
                    <TableCell className="text-xs text-right">{pct((s.social_security_rate || 0) * 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* CAPEX */}
      {data.capex?.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">🏗️ Investissements (CAPEX)</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Investissement</TableHead>
                  <TableHead className="text-xs text-right">Année</TableHead>
                  <TableHead className="text-xs text-right">Montant (FCFA)</TableHead>
                  <TableHead className="text-xs text-right">Amortissement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.capex.map((c: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{c.label}</TableCell>
                    <TableCell className="text-xs text-right">{c.acquisition_year}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(c.acquisition_value)}</TableCell>
                    <TableCell className="text-xs text-right">{pct((c.amortisation_rate_pct || 0) * 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Loans */}
      {data.loans && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">🏦 Financement</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(data.loans).map(([key, loan]: [string, any]) => {
                if (!loan?.amount) return null;
                const loanLabels: Record<string, string> = { ovo: 'Prêt OVO', family: 'Prêt Famille', bank: 'Prêt Banque' };
                return (
                  <div key={key} className="p-3 rounded-lg border bg-muted/20">
                    <p className="text-xs font-semibold">{loanLabels[key] || key}</p>
                    <p className="text-sm font-bold mt-1">{fmt(loan.amount)} FCFA</p>
                    <p className="text-[10px] text-muted-foreground">Taux: {pct((loan.rate || 0) * 100)} • {loan.term_years} ans</p>
                  </div>
                );
              })}
            </div>
            {data.funding_need != null && data.funding_need > 0 && (
              <div className="mt-3 p-2 rounded bg-primary/10 text-xs">
                <span className="font-semibold">Besoin de financement total: </span>
                <span className="font-bold text-primary">{fmt(data.funding_need)} FCFA</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Break-even */}
      {data.break_even_year && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-xs font-semibold text-success">Point mort atteint en</p>
              <p className="text-lg font-bold text-success">{data.break_even_year}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Assumptions */}
      {data.key_assumptions?.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">📝 Hypothèses clés</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ul className="space-y-1">
              {data.key_assumptions.map((a: string, i: number) => (
                <li key={i} className="text-xs flex gap-2">
                  <span className="text-primary shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Scenarios OVO */}
      {data.scenarios && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">🔮 Scénarios OVO (Optimiste-Vraisemblable-Pessimiste)</CardTitle>
          </CardHeader>
          <CardContent className="py-2 space-y-3">
            {(['optimiste', 'realiste', 'pessimiste'] as const).map(key => {
              const s = data.scenarios[key];
              if (!s) return null;
              const icons: Record<string, string> = { optimiste: '🚀', realiste: '📊', pessimiste: '⚠️' };
              const colors: Record<string, string> = { 
                optimiste: 'border-success/30 bg-success/5', 
                realiste: 'border-primary/30 bg-primary/5', 
                pessimiste: 'border-warning/30 bg-warning/5' 
              };
              return (
                <div key={key} className={`p-3 rounded-lg border ${colors[key]}`}>
                  <p className="text-xs font-bold uppercase mb-1">{icons[key]} Scénario {key}</p>
                  <p className="text-[11px] text-muted-foreground mb-2">{s.hypotheses}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">Croissance:</span> <span className="font-semibold">{s.taux_croissance_ca}</span></div>
                    {s.revenue_year5 != null && <div><span className="text-muted-foreground">CA An 5:</span> <span className="font-semibold">{fmt(s.revenue_year5)}</span></div>}
                    {s.ebitda_year5 != null && <div><span className="text-muted-foreground">EBITDA An 5:</span> <span className="font-semibold">{fmt(s.ebitda_year5)}</span></div>}
                    {s.net_profit_year5 != null && <div><span className="text-muted-foreground">Résultat An 5:</span> <span className="font-semibold">{fmt(s.net_profit_year5)}</span></div>}
                  </div>
                  {/* Support legacy projections array */}
                  {s.projections?.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead><tr className="border-b border-border/30">
                          <th className="text-left py-1">Année</th><th className="text-right py-1">CA</th><th className="text-right py-1">Résultat</th><th className="text-right py-1">Trésorerie</th>
                        </tr></thead>
                        <tbody>
                          {s.projections.map((p: any, i: number) => (
                            <tr key={i} className="border-b border-border/20">
                              <td className="py-0.5">{p.annee}</td>
                              <td className="text-right">{fmt(p.ca)}</td>
                              <td className="text-right">{fmt(p.resultat_net)}</td>
                              <td className="text-right">{fmt(p.tresorerie)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {data.recommandations?.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">🎯 Recommandations</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ul className="space-y-1">
              {data.recommandations.map((r: string, i: number) => (
                <li key={i} className="text-xs flex gap-2"><span className="text-primary">→</span>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Products & Services */}
      {(data.products?.length > 0 || data.services?.length > 0) && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">🛍️ Produits & Services</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {(data.products || []).map((p: any, i: number) => (
                <Badge key={`p-${i}`} variant="outline" className="text-[10px]">
                  📦 {p.name} ({p.range} • {p.channel})
                </Badge>
              ))}
              {(data.services || []).map((s: any, i: number) => (
                <Badge key={`s-${i}`} variant="secondary" className="text-[10px]">
                  🔧 {s.name} ({s.range} • {s.channel})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
