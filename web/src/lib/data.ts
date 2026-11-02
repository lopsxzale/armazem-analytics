// Dados gerados por `python src/export_web.py` (a partir do banco montado com data/app e data/sim). Não editar à mão.
// Convenção: campos *_pct já estão em pontos percentuais (26.8 = 26,8%).
import abcJson from "@/data/abc.json";
import findingsJson from "@/data/findings.json";
import matrizJson from "@/data/matriz.json";
import mensalJson from "@/data/mensal.json";
import metaJson from "@/data/meta.json";
import paretoJson from "@/data/pareto.json";
import simuladorJson from "@/data/simulador.json";
import sqlJson from "@/data/sql.json";
import tendenciaJson from "@/data/tendencia.json";

export const PACKAGES = ["long_neck", "lata", "barril", "outras"] as const;
export type Package = (typeof PACKAGES)[number];

export const STAGES = ["doca", "armazenagem", "separacao", "carregamento"] as const;
export type Stage = (typeof STAGES)[number];

export type Reason =
  | "quebra_manuseio"
  | "queda_palete"
  | "amassado"
  | "empilhamento"
  | "colisao_empilhadeira"
  | "vazamento"
  | "vencimento"
  | "avaria_fornecedor";

export type Meta = {
  gerado_em: string;
  periodo_inicio: string;
  periodo_fim: string;
  meses: number;
  itens: number;
  fornecedores: number;
  caixas_movimentadas: number;
  caixas_avariadas: number;
  custo_total_brl: number;
  custo_medio_mensal_brl: number;
  taxa_pct: number;
  fao: { perda_pct: number; ano: number; fonte: string };
  taxa_base_pct: number;
  seed: number;
};

export type Pareto = {
  combos: {
    motivo_id: Reason;
    etapa_id: Stage;
    caixas: number;
    custo_brl: number;
    pct: number;
    pct_acum: number;
    posicao: number;
  }[];
  motivos: { motivo_id: Reason; custo_brl: number; pct: number; pct_acum: number }[];
  etapas: { etapa_id: Stage; custo_brl: number; pct: number; pct_acum: number }[];
  combos_ate_80: number;
  total_combos: number;
};

export type Monthly = {
  meses: {
    periodo: string;
    caixas_movimentadas: number;
    caixas_avariadas: number;
    custo_brl: number;
    taxa_pct: number;
    meses_desde_anterior: number | null;
  }[];
};

export type Matrix = {
  celulas: {
    embalagem_id: Package;
    etapa_id: Stage;
    caixas_avariadas: number;
    custo_brl: number;
    taxa_pct: number;
    pct_custo: number;
  }[];
  embalagens: {
    embalagem_id: Package;
    caixas_movimentadas: number;
    pct_volume: number;
    custo_brl: number;
    caixas_avariadas: number;
    pct_custo: number;
    taxa_pct: number;
  }[];
};

export type Trend = {
  janelas: { id: string; rotulo: string }[];
  series: {
    janela: string;
    etapa_id: Stage;
    meses: number;
    caixas_avariadas: number;
    taxa_pct: number;
    var_pp: number | null;
    var_vs_inicio_pct: number;
  }[];
  var_final_pct: Record<Stage, number>;
};

export type Abc = {
  classes: {
    classe: "A" | "B" | "C";
    itens: number;
    caixas_movimentadas: number;
    pct_volume: number;
    caixas_avariadas: number;
    custo_brl: number;
    pct_custo: number;
    taxa_pct: number;
  }[];
  top_itens: {
    item_code: string;
    descricao: string;
    embalagem_id: Package;
    motivo_id: Reason;
    caixas_avariadas: number;
    custo_brl: number;
    taxa_pct: number;
  }[];
};

export type Simulator = {
  caixas_mes: { etapa_id: Stage; embalagem_id: Package; caixas: number }[];
  precos: Record<Package, number>;
  reducao_padrao: number;
};

export type Findings = {
  achados: {
    top3_pct: number;
    top3: { motivo_id: Reason; etapa_id: Stage; pct: number }[];
    combos_ate_80: number;
    long_neck_pct_custo: number;
    long_neck_pct_volume: number;
    long_neck_taxa_pct: number;
    lata_taxa_pct: number;
    separacao_var_pct: number;
    outras_var_media_pct: number;
  };
  acoes: {
    reducao_pct: number;
    economia_separacao_mes: number;
    economia_long_neck_mes: number;
    economia_top3_mes: number;
  };
  custo_medio_mensal_brl: number;
};

export type SqlId = "q1" | "q2" | "q3" | "q4" | "q5" | "q6";
export type SqlFile = { arquivo: string; titulo: string; sql: string };

export const meta = metaJson as Meta;
export const pareto = paretoJson as Pareto;
export const monthly = mensalJson as Monthly;
export const matrix = matrizJson as Matrix;
export const trend = tendenciaJson as Trend;
export const abc = abcJson as Abc;
export const simulator = simuladorJson as Simulator;
export const findings = findingsJson as Findings;
export const sqlFiles = sqlJson as Record<SqlId, SqlFile>;
