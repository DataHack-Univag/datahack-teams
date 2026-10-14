import { SubAbas } from "@/shared/ui/Pagina";

/** Sub-abas da aba Pessoas: cadastro de quem participa e a chamada (presença no evento). */
export function SubAbasPessoas({ ativa, pessoas, alunos }: { ativa: "cadastro" | "presenca"; pessoas?: number; alunos?: number }) {
  return (
    <SubAbas
      ativa={ativa}
      abas={[
        { id: "cadastro", rotulo: "Cadastro", href: "/admin/pessoas", contagem: pessoas },
        { id: "presenca", rotulo: "Presença", href: "/admin/pessoas/presenca", contagem: alunos },
      ]}
    />
  );
}
