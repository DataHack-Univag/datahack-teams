import { describe, expect, it } from "vitest";
import { edicaoEmExibicao } from "@/modules/edicoes/domain/tipos";

const ed = (numero: number, situacao: string, atual = false, data_inicio: string | null = null) => ({ id: String(numero), numero, situacao: situacao as never, atual, data_inicio });

describe("edicaoEmExibicao (a que o login e o sistema mostram)", () => {
  it("é a atual quando existe", () => {
    expect(edicaoEmExibicao([ed(1, "encerrada", false, "2026-10-09"), ed(2, "em_andamento", true, "2027-06-01")])?.numero).toBe(2);
  });
  it("sem atual, é a última encerrada (planejada não conta)", () => {
    expect(edicaoEmExibicao([ed(1, "encerrada", false, "2026-10-09"), ed(2, "planejada", false, "2027-06-01")])?.numero).toBe(1);
    expect(edicaoEmExibicao([ed(1, "encerrada", false, "2025-10-09"), ed(3, "encerrada", false, "2026-10-09"), ed(2, "cancelada")])?.numero).toBe(3);
  });
  it("sem atual e sem encerrada: nenhuma", () => {
    expect(edicaoEmExibicao([ed(2, "planejada")])).toBeUndefined();
  });
});
