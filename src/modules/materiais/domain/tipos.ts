export type CategoriaMaterial =
  | "desafio"
  | "dados"
  | "dicionario"
  | "documentacao"
  | "github"
  | "regulamento"
  | "apresentacao"
  | "outro";

export const CATEGORIAS_MATERIAL: { valor: CategoriaMaterial; rotulo: string }[] = [
  { valor: "desafio", rotulo: "Desafio" },
  { valor: "documentacao", rotulo: "Documentação" },
  { valor: "github", rotulo: "Repositório GitHub" },
  { valor: "dados", rotulo: "Fonte de dados" },
  { valor: "dicionario", rotulo: "Dicionário de dados" },
  { valor: "regulamento", rotulo: "Regulamento" },
  { valor: "apresentacao", rotulo: "Apresentação" },
  { valor: "outro", rotulo: "Outro" },
];

export const rotuloMaterial = (c: string) => CATEGORIAS_MATERIAL.find((x) => x.valor === c)?.rotulo ?? c;

export type Material = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: CategoriaMaterial;
  url: string;
  destaque: boolean;
  criado_em: string;
};
