// ARQUIVO GERADO por scripts/gerar_tipos_banco.mjs a partir do banco. Não edite à mão.
// Para atualizar depois de uma migração: veja o comentário no topo do script.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      avaliacoes: {
        Row: {
          id: string;
          equipe_id: string;
          avaliador: string;
          rubrica: string;
          notas: Json;
          comentario: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          equipe_id: string;
          avaliador: string;
          rubrica: string;
          notas?: Json;
          comentario?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          equipe_id?: string;
          avaliador?: string;
          rubrica?: string;
          notas?: Json;
          comentario?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "avaliacoes_avaliador_fkey";
            columns: ["avaliador"];
            isOneToOne: false;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "avaliacoes_equipe_id_fkey";
            columns: ["equipe_id"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
        ];
      };
      configuracao: {
        Row: {
          id: number;
          max_membros: number;
          edicao_bloqueada: boolean;
          avaliacao_encerrada: boolean;
        };
        Insert: {
          id?: number;
          max_membros?: number;
          edicao_bloqueada?: boolean;
          avaliacao_encerrada?: boolean;
        };
        Update: {
          id?: number;
          max_membros?: number;
          edicao_bloqueada?: boolean;
          avaliacao_encerrada?: boolean;
        };
        Relationships: [];
      };
      equipes: {
        Row: {
          id: string;
          nome: string;
          repo_github: string | null;
          repo_publico: boolean | null;
          repo_verificado_em: string | null;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
          lider_email: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          repo_github?: string | null;
          repo_publico?: boolean | null;
          repo_verificado_em?: string | null;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          lider_email?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          repo_github?: string | null;
          repo_publico?: boolean | null;
          repo_verificado_em?: string | null;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          lider_email?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipes_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "equipes_lider_email_fkey";
            columns: ["lider_email"];
            isOneToOne: false;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
        ];
      };
      inscritos: {
        Row: {
          email: string;
          nome: string;
          curso: string | null;
          semestre: number | null;
          papel: string;
          criado_em: string;
        };
        Insert: {
          email: string;
          nome: string;
          curso?: string | null;
          semestre?: number | null;
          papel?: string;
          criado_em?: string;
        };
        Update: {
          email?: string;
          nome?: string;
          curso?: string | null;
          semestre?: number | null;
          papel?: string;
          criado_em?: string;
        };
        Relationships: [];
      };
      links: {
        Row: {
          id: string;
          equipe_id: string;
          categoria: string;
          titulo: string | null;
          url: string;
          criado_por: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          equipe_id: string;
          categoria: string;
          titulo?: string | null;
          url: string;
          criado_por?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          equipe_id?: string;
          categoria?: string;
          titulo?: string | null;
          url?: string;
          criado_por?: string | null;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "links_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "links_equipe_id_fkey";
            columns: ["equipe_id"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
        ];
      };
      materiais: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          categoria: string;
          url: string;
          destaque: boolean;
          criado_por: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descricao?: string | null;
          categoria: string;
          url: string;
          destaque?: boolean;
          criado_por?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string | null;
          categoria?: string;
          url?: string;
          destaque?: boolean;
          criado_por?: string | null;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "materiais_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
        ];
      };
      membros: {
        Row: {
          email: string;
          equipe_id: string;
          entrou_em: string;
        };
        Insert: {
          email: string;
          equipe_id: string;
          entrou_em?: string;
        };
        Update: {
          email?: string;
          equipe_id?: string;
          entrou_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membros_email_fkey";
            columns: ["email"];
            isOneToOne: true;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "membros_equipe_id_fkey";
            columns: ["equipe_id"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
        ];
      };
      notas: {
        Row: {
          email: string;
          nota: number | null;
        };
        Insert: {
          email: string;
          nota?: number | null;
        };
        Update: {
          email?: string;
          nota?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "notas_email_fkey";
            columns: ["email"];
            isOneToOne: true;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
        ];
      };
      penalidades_aplicadas: {
        Row: {
          equipe_id: string;
          penalidade: string;
          aplicado_por: string | null;
          criado_em: string;
        };
        Insert: {
          equipe_id: string;
          penalidade: string;
          aplicado_por?: string | null;
          criado_em?: string;
        };
        Update: {
          equipe_id?: string;
          penalidade?: string;
          aplicado_por?: string | null;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "penalidades_aplicadas_aplicado_por_fkey";
            columns: ["aplicado_por"];
            isOneToOne: false;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "penalidades_aplicadas_equipe_id_fkey";
            columns: ["equipe_id"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
        ];
      };
      trocas: {
        Row: {
          id: string;
          solicitante: string | null;
          equipe_origem: string | null;
          equipe_destino: string | null;
          status: string;
          mensagem: string | null;
          respondido_por: string | null;
          criado_em: string;
          respondido_em: string | null;
          solicitante_nome: string | null;
          origem_nome: string | null;
          destino_nome: string | null;
          respondido_nome: string | null;
        };
        Insert: {
          id?: string;
          solicitante?: string | null;
          equipe_origem?: string | null;
          equipe_destino?: string | null;
          status?: string;
          mensagem?: string | null;
          respondido_por?: string | null;
          criado_em?: string;
          respondido_em?: string | null;
          solicitante_nome?: string | null;
          origem_nome?: string | null;
          destino_nome?: string | null;
          respondido_nome?: string | null;
        };
        Update: {
          id?: string;
          solicitante?: string | null;
          equipe_origem?: string | null;
          equipe_destino?: string | null;
          status?: string;
          mensagem?: string | null;
          respondido_por?: string | null;
          criado_em?: string;
          respondido_em?: string | null;
          solicitante_nome?: string | null;
          origem_nome?: string | null;
          destino_nome?: string | null;
          respondido_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trocas_equipe_destino_fkey";
            columns: ["equipe_destino"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trocas_equipe_origem_fkey";
            columns: ["equipe_origem"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trocas_respondido_por_fkey";
            columns: ["respondido_por"];
            isOneToOne: false;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "trocas_solicitante_fkey";
            columns: ["solicitante"];
            isOneToOne: false;
            referencedRelation: "inscritos";
            referencedColumns: ["email"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      aceitar_troca: { Args: { p_pedido: string; p_como?: string }; Returns: string };
      aplicar_equipes: { Args: { p_equipes: Json; p_substituir?: boolean }; Returns: number };
      cancelar_troca: { Args: { p_pedido: string; p_como?: string }; Returns: undefined };
      criar_equipe: { Args: { p_nome: string; p_repo: string }; Returns: string };
      edicao_liberada: { Args: Record<PropertyKey, never>; Returns: boolean };
      eh_avaliador: { Args: Record<PropertyKey, never>; Returns: boolean };
      eh_inscrito: { Args: Record<PropertyKey, never>; Returns: boolean };
      eh_organizador: { Args: Record<PropertyKey, never>; Returns: boolean };
      email_atual: { Args: Record<PropertyKey, never>; Returns: string };
      minha_equipe: { Args: Record<PropertyKey, never>; Returns: string };
      nome_de: { Args: { p_email: string }; Returns: string };
      normalizar_email: { Args: { p: string }; Returns: string };
      papel_atual: { Args: Record<PropertyKey, never>; Returns: string };
      pedir_troca: { Args: { p_destino: string; p_mensagem?: string; p_como?: string }; Returns: string };
      pode_avaliar: { Args: { p_rubrica: string }; Returns: boolean };
      quem_age: { Args: { p_como: string }; Returns: string };
      recusar_troca: { Args: { p_pedido: string; p_como?: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type Publico = Database["public"];
/** Linha de uma tabela: Linha<"equipes">. */
export type Linha<T extends keyof Publico["Tables"]> = Publico["Tables"][T]["Row"];
export type NovaLinha<T extends keyof Publico["Tables"]> = Publico["Tables"][T]["Insert"];
