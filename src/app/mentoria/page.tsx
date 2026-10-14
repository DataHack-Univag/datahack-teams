import { redirect } from "next/navigation";

// A área da mentoria abre nas equipes.
export default function Mentoria() {
  redirect("/mentoria/equipes");
}
