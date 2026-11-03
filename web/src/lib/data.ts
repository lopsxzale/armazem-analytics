// Dados gerados por `python src/export_web.py` (a partir do banco montado com data/app e data/sim). Não editar à mão.
// Convenção: campos *_pct já estão em pontos percentuais (26.8 = 26,8%).
import abcJson from "@/data/abc.json";
import findingsJson from "@/data/findings.json";
import inventarioJson from "@/data/inventario.json";
import matrizJson from "@/data/matriz.json";
import mensalJson from "@/data/mensal.json";
import metaJson from "@/data/meta.json";
import paretoJson from "@/data/pareto.json";
import realJson from "@/data/real.json";
import sensJson from "@/data/sensibilidade.json";
import simuladorJson from "@/data/simulador.json";
import sqlJson from "@/data/sql.json";
import tendenciaJson from "@/data/tendencia.json";
import vasilhameJson from "@/data/vasilhame.json";

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
    taxa_ajustada_pct: number;
    var_ajustada_vs_inicio_pct: number;
  }[];
  var_final_pct: Record<Stage, number>;
  var_final_ajustada_pct: Record<Stage, number>;
};

export type Real = {
  mix: { ano: number; embalagem_id: Package; caixas_movimentadas: number; pct: number }[];
  ano_inicio: number;
  ano_fim: number;
  lata_inicio_pct: number;
  lata_fim_pct: number;
  long_neck_inicio_pct: number;
  long_neck_fim_pct: number;
  estornos: {
    embalagem_id: Package;
    caixas_devolvidas: number;
    caixas_movimentadas: number;
    taxa_pct: number;
    meses_com_estorno: number;
    itens_com_estorno: number;
  }[];
  estornos_total: number;
  estornos_taxa_pct: number;
  itens_a: number;
  itens_total: number;
  pct_volume_a: number;
};

export type Range = { p5: number; p50: number; p95: number };
export type SensKey =
  | "top3_pct"
  | "long_neck_pct_custo"
  | "foco_var_pct"
  | "foco_var_ajustada_pct"
  | "outras_var_ajustada_media_pct";
export type PremiseKey = "mult_long_neck" | "participacao_separacao" | "tendencia_separacao";
export type Sensitivity = {
  rodadas: number;
  rodadas_nulo: number;
  faixas_premissas: Record<PremiseKey, { min: number; max: number }>;
  faixas: Record<SensKey, Range>;
  nulo: Record<SensKey, Range>;
  recuperacao: { erro_mediano_pp: number; erro_absoluto_p90_pp: number };
  dependencia: Record<SensKey, Record<PremiseKey, number>>;
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
    separacao_var_ajustada_pct: number;
    outras_var_ajustada_media_pct: number;
    tendencia_plantada_pct: number;
  };
  acoes: {
    reducao_pct: number;
    economia_separacao_mes: number;
    economia_long_neck_mes: number;
    economia_top3_mes: number;
  };
  custo_medio_mensal_brl: number;
};

export type SqlId = "q1" | "q2" | "q3" | "q4" | "q5" | "q6" | "q7" | "q8" | "q9" | "q10" | "q11" | "q12" | "q13" | "q14";

// Vasilhame retornável (camada 100% simulada)
export const BOTTLES = ["1L", "600A", "600V", "300ml"] as const;
export type Bottle = (typeof BOTTLES)[number];
export const BOTTLE_REASONS = ["quebrada", "trincada", "sujidade_interna", "bicada_externa", "bicada_interna"] as const;
export type BottleReason = (typeof BOTTLE_REASONS)[number];
export const BOTTLE_STAGES = ["retorno_rota", "triagem", "armazenagem_vasilhame", "separacao_carregamento"] as const;
export type BottleStage = (typeof BOTTLE_STAGES)[number];
export type Bottles = {
  tipos: {
    tipo_id: Bottle;
    ordem: number;
    cascos_refugados: number;
    cascos_tipo: number;
    custo_brl: number;
    taxa_pct: number;
    pct_cascos: number;
    pct_custo: number;
    preco_casco_brl: number;
  }[];
  celulas: {
    tipo_id: Bottle;
    motivo_id: BottleReason;
    cascos_refugados: number;
    custo_brl: number;
    taxa_pct: number;
    pct_custo: number;
  }[];
  motivos: { motivo_id: BottleReason; cascos_refugados: number; pct: number }[];
  etapas: { etapa_id: BottleStage; cascos_refugados: number; custo_brl: number; pct: number; pct_acum: number }[];
  mensal: { periodo: string; cascos: number; cascos_refugados: number; custo_brl: number; taxa_pct: number }[];
  premissas: {
    cascos_mes: number;
    taxa_base_refugo_pct: number;
    meses: number;
    periodo_inicio: string;
    periodo_fim: string;
    seed: number;
  };
  achados: {
    refugados_mes: number;
    custo_mes_brl: number;
    cascos_mes: number;
    taxa_pct: number;
    pior_tipo: Bottle;
    pior_taxa_pct: number;
    pior_pct_cascos: number;
    pior_pct_custo: number;
    melhor_tipo: Bottle;
    melhor_taxa_pct: number;
    pior_vs_melhor: number;
    top_motivo: BottleReason;
    top_motivo_pct: number;
    de_fora_pct: number;
    interno_pct: number;
    economia_interno_mes: number;
    reducao_pct: number;
    pico_periodo: string;
    pico_refugados: number;
  };
};

export type AbcClass = "A" | "B" | "C";
export type Cause = "erro_separacao" | "erro_recebimento" | "avaria_nao_baixada";
export type Inventory = {
  ira: {
    classe: AbcClass;
    contagens: number;
    ira_pct: number;
    eventos_por_contagem: number;
    caixas_divergentes: number;
    estoque_medio: number;
  }[];
  causas: { causa_id: Cause; eventos: number; caixas: number; valor_brl: number; pct: number; pct_acum: number }[];
  top_itens: {
    item_code: string;
    descricao: string;
    embalagem_id: Package;
    classe: AbcClass;
    causa_principal: Cause;
    eventos: number;
    valor_brl: number;
  }[];
  frequencia: {
    classe: AbcClass;
    eventos_dia: number;
    tolerancia_eventos: number;
    intervalo_dias: number;
    ira_recomendada_pct: number;
    ira_mensal_pct: number;
    itens_ativos: number;
    posicoes: number;
    contagens_mes: number;
    custo_mes_brl: number;
    custo_mensal_todos_brl: number;
    ira_por_intervalo: Record<string, number>;
  }[];
  premissas: {
    cobertura_dias: Record<AbcClass, number>;
    posicoes: Record<AbcClass, number>;
    taxa_erro_separacao: number;
    taxa_erro_recebimento: number;
    fracao_avaria_nao_baixada: number;
    caixas_por_erro: number;
    tolerancia_pct: number;
    custo_contagem_posicao_brl: number;
    ira_meta_pct: number;
    intervalos_dias: number[];
  };
  achados: {
    ira_a_mensal_pct: number;
    ira_c_mensal_pct: number;
    ira_a_modelo_mensal_pct: number;
    avaria_nao_baixada_pct: number;
    intervalo_a: number;
    intervalo_b: number;
    intervalo_c: number;
    ira_a_recomendada_pct: number;
    custo_recomendado_mes: number;
    custo_todos_mensal_mes: number;
    itens_ativos: number;
  };
};
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
export const real = realJson as Real;
export const sensitivity = sensJson as Sensitivity;
export const inventory = inventarioJson as Inventory;
export const bottles = vasilhameJson as Bottles;
