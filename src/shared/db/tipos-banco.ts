// ARQUIVO GERADO por scripts/gerar_tipos_banco.mjs a partir do banco. Não edite à mão.
// Para atualizar depois de uma migração: veja o comentário no topo do script.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      alocacoes: {
        Row: {
          id: string;
          edicao_id: string;
          equipe_id: string;
          elemento_id: string;
          lugar: number;
          desde: string;
          ate: string | null;
          por: string | null;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          equipe_id: string;
          elemento_id: string;
          lugar: number;
          desde?: string;
          ate?: string | null;
          por?: string | null;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          equipe_id?: string;
          elemento_id?: string;
          lugar?: number;
          desde?: string;
          ate?: string | null;
          por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alocacoes_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alocacoes_elemento_id_fkey";
            columns: ["elemento_id"];
            isOneToOne: false;
            referencedRelation: "mapa_elementos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alocacoes_equipe_id_fkey";
            columns: ["equipe_id"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alocacoes_por_fkey";
            columns: ["por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
        ];
      };
      avaliacoes_legado: {
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
            referencedRelation: "pessoas";
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
      bancas: {
        Row: {
          id: string;
          edicao_id: string;
          codigo: string;
          nome: string;
          descricao: string | null;
          da_organizacao: boolean;
          ordem: number;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          codigo: string;
          nome: string;
          descricao?: string | null;
          da_organizacao?: boolean;
          ordem?: number;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          codigo?: string;
          nome?: string;
          descricao?: string | null;
          da_organizacao?: boolean;
          ordem?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bancas_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
        ];
      };
      configuracao_legado: {
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
      criterio_niveis: {
        Row: {
          criterio_id: string;
          nivel_id: string;
          descricao: string;
        };
        Insert: {
          criterio_id: string;
          nivel_id: string;
          descricao: string;
        };
        Update: {
          criterio_id?: string;
          nivel_id?: string;
          descricao?: string;
        };
        Relationships: [
          {
            foreignKeyName: "criterio_niveis_criterio_id_fkey";
            columns: ["criterio_id"];
            isOneToOne: false;
            referencedRelation: "criterios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "criterio_niveis_nivel_id_fkey";
            columns: ["nivel_id"];
            isOneToOne: false;
            referencedRelation: "niveis";
            referencedColumns: ["id"];
          },
        ];
      };
      criterios: {
        Row: {
          id: string;
          edicao_id: string;
          rubrica_id: string;
          codigo: string;
          nome: string;
          peso: number;
          descricao: string | null;
          ordem: number;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          rubrica_id: string;
          codigo: string;
          nome: string;
          peso: number;
          descricao?: string | null;
          ordem?: number;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          rubrica_id?: string;
          codigo?: string;
          nome?: string;
          peso?: number;
          descricao?: string | null;
          ordem?: number;
        };
        Relationships: [
          {
            foreignKeyName: "criterios_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "criterios_rubrica_id_fkey";
            columns: ["rubrica_id"];
            isOneToOne: false;
            referencedRelation: "rubricas";
            referencedColumns: ["id"];
          },
        ];
      };
      edicoes: {
        Row: {
          id: string;
          numero: number;
          slug: string;
          nome: string;
          descricao: string | null;
          formato: string | null;
          local: string | null;
          data_inicio: string | null;
          data_fim: string | null;
          situacao: string;
          atual: boolean;
          modo_formacao: string;
          permite_trocas: boolean;
          min_membros: number;
          max_membros: number;
          equipes_travadas: boolean;
          avaliacao_encerrada: boolean;
          formula: string | null;
          desclassificacao: string | null;
          metadados: Json;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          numero: number;
          slug: string;
          nome: string;
          descricao?: string | null;
          formato?: string | null;
          local?: string | null;
          data_inicio?: string | null;
          data_fim?: string | null;
          situacao?: string;
          atual?: boolean;
          modo_formacao?: string;
          permite_trocas?: boolean;
          min_membros?: number;
          max_membros?: number;
          equipes_travadas?: boolean;
          avaliacao_encerrada?: boolean;
          formula?: string | null;
          desclassificacao?: string | null;
          metadados?: Json;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          numero?: number;
          slug?: string;
          nome?: string;
          descricao?: string | null;
          formato?: string | null;
          local?: string | null;
          data_inicio?: string | null;
          data_fim?: string | null;
          situacao?: string;
          atual?: boolean;
          modo_formacao?: string;
          permite_trocas?: boolean;
          min_membros?: number;
          max_membros?: number;
          equipes_travadas?: boolean;
          avaliacao_encerrada?: boolean;
          formula?: string | null;
          desclassificacao?: string | null;
          metadados?: Json;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
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
          edicao_id: string;
          origem: string;
          situacao: string;
          proposta_por: string | null;
          analisado_por: string | null;
          analisado_em: string | null;
          motivo_analise: string | null;
          removido_em: string | null;
          removido_por: string | null;
          icone: string | null;
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
          edicao_id: string;
          origem?: string;
          situacao?: string;
          proposta_por?: string | null;
          analisado_por?: string | null;
          analisado_em?: string | null;
          motivo_analise?: string | null;
          removido_em?: string | null;
          removido_por?: string | null;
          icone?: string | null;
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
          edicao_id?: string;
          origem?: string;
          situacao?: string;
          proposta_por?: string | null;
          analisado_por?: string | null;
          analisado_em?: string | null;
          motivo_analise?: string | null;
          removido_em?: string | null;
          removido_por?: string | null;
          icone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipes_analisado_por_fkey";
            columns: ["analisado_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "equipes_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "equipes_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipes_lider_email_fkey";
            columns: ["lider_email"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "equipes_proposta_por_fkey";
            columns: ["proposta_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "equipes_removido_por_fkey";
            columns: ["removido_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
        ];
      };
      fases: {
        Row: {
          id: string;
          edicao_id: string;
          codigo: string;
          nome: string;
          peso: number;
          ordem: number;
          descricao: string | null;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          codigo: string;
          nome: string;
          peso: number;
          ordem?: number;
          descricao?: string | null;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          codigo?: string;
          nome?: string;
          peso?: number;
          ordem?: number;
          descricao?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fases_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
        ];
      };
      fichas: {
        Row: {
          id: string;
          edicao_id: string;
          equipe_id: string;
          rubrica_id: string;
          avaliador: string;
          comentario: string | null;
          criado_em: string;
          atualizado_em: string;
          removido_em: string | null;
          removido_por: string | null;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          equipe_id: string;
          rubrica_id: string;
          avaliador: string;
          comentario?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          removido_em?: string | null;
          removido_por?: string | null;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          equipe_id?: string;
          rubrica_id?: string;
          avaliador?: string;
          comentario?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          removido_em?: string | null;
          removido_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fichas_avaliador_fkey";
            columns: ["avaliador"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "fichas_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fichas_equipe_id_fkey";
            columns: ["equipe_id"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fichas_removido_por_fkey";
            columns: ["removido_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "fichas_rubrica_id_fkey";
            columns: ["rubrica_id"];
            isOneToOne: false;
            referencedRelation: "rubricas";
            referencedColumns: ["id"];
          },
        ];
      };
      historico: {
        Row: {
          id: number;
          tabela: string;
          operacao: string;
          antes: Json | null;
          depois: Json | null;
          por: string | null;
          em: string;
        };
        Insert: {
          id?: number;
          tabela: string;
          operacao: string;
          antes?: Json | null;
          depois?: Json | null;
          por?: string | null;
          em?: string;
        };
        Update: {
          id?: number;
          tabela?: string;
          operacao?: string;
          antes?: Json | null;
          depois?: Json | null;
          por?: string | null;
          em?: string;
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
          removido_em: string | null;
          removido_por: string | null;
        };
        Insert: {
          id?: string;
          equipe_id: string;
          categoria: string;
          titulo?: string | null;
          url: string;
          criado_por?: string | null;
          criado_em?: string;
          removido_em?: string | null;
          removido_por?: string | null;
        };
        Update: {
          id?: string;
          equipe_id?: string;
          categoria?: string;
          titulo?: string | null;
          url?: string;
          criado_por?: string | null;
          criado_em?: string;
          removido_em?: string | null;
          removido_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "links_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "links_equipe_id_fkey";
            columns: ["equipe_id"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "links_removido_por_fkey";
            columns: ["removido_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
        ];
      };
      mapa_elementos: {
        Row: {
          id: string;
          edicao_id: string;
          sala_id: string;
          tipo: string;
          rotulo: string | null;
          x_cm: number;
          y_cm: number;
          largura_cm: number;
          profundidade_cm: number;
          rotacao: number;
          lugares: number | null;
          criado_em: string;
          atualizado_em: string;
          removido_em: string | null;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          sala_id: string;
          tipo: string;
          rotulo?: string | null;
          x_cm: number;
          y_cm: number;
          largura_cm: number;
          profundidade_cm: number;
          rotacao?: number;
          lugares?: number | null;
          criado_em?: string;
          atualizado_em?: string;
          removido_em?: string | null;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          sala_id?: string;
          tipo?: string;
          rotulo?: string | null;
          x_cm?: number;
          y_cm?: number;
          largura_cm?: number;
          profundidade_cm?: number;
          rotacao?: number;
          lugares?: number | null;
          criado_em?: string;
          atualizado_em?: string;
          removido_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mapa_elementos_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mapa_elementos_sala_id_fkey";
            columns: ["sala_id"];
            isOneToOne: false;
            referencedRelation: "salas";
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
          edicao_id: string;
          removido_em: string | null;
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
          edicao_id: string;
          removido_em?: string | null;
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
          edicao_id?: string;
          removido_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "materiais_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "materiais_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
        ];
      };
      membros: {
        Row: {
          email: string;
          equipe_id: string;
          entrou_em: string;
          id: string;
          edicao_id: string;
          situacao: string;
          convidado_por: string | null;
          saiu_em: string | null;
          motivo_saida: string | null;
        };
        Insert: {
          email: string;
          equipe_id: string;
          entrou_em?: string;
          id?: string;
          edicao_id: string;
          situacao?: string;
          convidado_por?: string | null;
          saiu_em?: string | null;
          motivo_saida?: string | null;
        };
        Update: {
          email?: string;
          equipe_id?: string;
          entrou_em?: string;
          id?: string;
          edicao_id?: string;
          situacao?: string;
          convidado_por?: string | null;
          saiu_em?: string | null;
          motivo_saida?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "membros_convidado_por_fkey";
            columns: ["convidado_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "membros_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membros_email_fkey";
            columns: ["email"];
            isOneToOne: false;
            referencedRelation: "pessoas";
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
      niveis: {
        Row: {
          id: string;
          edicao_id: string;
          nome: string;
          fator: number;
          ordem: number;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          nome: string;
          fator: number;
          ordem?: number;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          nome?: string;
          fator?: number;
          ordem?: number;
        };
        Relationships: [
          {
            foreignKeyName: "niveis_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
        ];
      };
      notas: {
        Row: {
          email: string;
          nota: number | null;
          edicao_id: string;
        };
        Insert: {
          email: string;
          nota?: number | null;
          edicao_id: string;
        };
        Update: {
          email?: string;
          nota?: number | null;
          edicao_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notas_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_email_fkey";
            columns: ["email"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
        ];
      };
      notas_criterio: {
        Row: {
          ficha_id: string;
          criterio_id: string;
          nivel_id: string | null;
        };
        Insert: {
          ficha_id: string;
          criterio_id: string;
          nivel_id?: string | null;
        };
        Update: {
          ficha_id?: string;
          criterio_id?: string;
          nivel_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notas_criterio_criterio_id_fkey";
            columns: ["criterio_id"];
            isOneToOne: false;
            referencedRelation: "criterios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_criterio_ficha_id_fkey";
            columns: ["ficha_id"];
            isOneToOne: false;
            referencedRelation: "fichas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_criterio_nivel_id_fkey";
            columns: ["nivel_id"];
            isOneToOne: false;
            referencedRelation: "niveis";
            referencedColumns: ["id"];
          },
        ];
      };
      participacoes: {
        Row: {
          edicao_id: string;
          email: string;
          papel: string;
          banca_id: string | null;
          curso: string | null;
          semestre: number | null;
          criado_em: string;
          removido_em: string | null;
          presenca: string | null;
          presenca_em: string | null;
          presenca_por: string | null;
        };
        Insert: {
          edicao_id: string;
          email: string;
          papel?: string;
          banca_id?: string | null;
          curso?: string | null;
          semestre?: number | null;
          criado_em?: string;
          removido_em?: string | null;
          presenca?: string | null;
          presenca_em?: string | null;
          presenca_por?: string | null;
        };
        Update: {
          edicao_id?: string;
          email?: string;
          papel?: string;
          banca_id?: string | null;
          curso?: string | null;
          semestre?: number | null;
          criado_em?: string;
          removido_em?: string | null;
          presenca?: string | null;
          presenca_em?: string | null;
          presenca_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "participacoes_banca_fkey";
            columns: ["banca_id"];
            isOneToOne: false;
            referencedRelation: "bancas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participacoes_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participacoes_email_fkey";
            columns: ["email"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "participacoes_presenca_por_fkey";
            columns: ["presenca_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
        ];
      };
      penalidades: {
        Row: {
          id: string;
          edicao_id: string;
          codigo: string;
          texto: string;
          pontos: number;
          ordem: number;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          codigo: string;
          texto: string;
          pontos: number;
          ordem?: number;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          codigo?: string;
          texto?: string;
          pontos?: number;
          ordem?: number;
        };
        Relationships: [
          {
            foreignKeyName: "penalidades_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
        ];
      };
      penalidades_aplicadas_legado: {
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
            referencedRelation: "pessoas";
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
      penalidades_equipe: {
        Row: {
          id: string;
          edicao_id: string;
          equipe_id: string;
          penalidade_id: string;
          aplicado_por: string | null;
          criado_em: string;
          removido_em: string | null;
          removido_por: string | null;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          equipe_id: string;
          penalidade_id: string;
          aplicado_por?: string | null;
          criado_em?: string;
          removido_em?: string | null;
          removido_por?: string | null;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          equipe_id?: string;
          penalidade_id?: string;
          aplicado_por?: string | null;
          criado_em?: string;
          removido_em?: string | null;
          removido_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "penalidades_equipe_aplicado_por_fkey";
            columns: ["aplicado_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "penalidades_equipe_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "penalidades_equipe_equipe_id_fkey";
            columns: ["equipe_id"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "penalidades_equipe_penalidade_id_fkey";
            columns: ["penalidade_id"];
            isOneToOne: false;
            referencedRelation: "penalidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "penalidades_equipe_removido_por_fkey";
            columns: ["removido_por"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
        ];
      };
      pessoas: {
        Row: {
          email: string;
          nome: string;
          criado_em: string;
          removido_em: string | null;
        };
        Insert: {
          email: string;
          nome: string;
          criado_em?: string;
          removido_em?: string | null;
        };
        Update: {
          email?: string;
          nome?: string;
          criado_em?: string;
          removido_em?: string | null;
        };
        Relationships: [];
      };
      pessoas_legado: {
        Row: {
          email: string | null;
          nome: string | null;
          curso: string | null;
          semestre: number | null;
          papel: string | null;
          criado_em: string | null;
        };
        Insert: {
          email?: string | null;
          nome?: string | null;
          curso?: string | null;
          semestre?: number | null;
          papel?: string | null;
          criado_em?: string | null;
        };
        Update: {
          email?: string | null;
          nome?: string | null;
          curso?: string | null;
          semestre?: number | null;
          papel?: string | null;
          criado_em?: string | null;
        };
        Relationships: [];
      };
      pisos: {
        Row: {
          id: string;
          edicao_id: string;
          nome: string;
          ordem: number;
          criado_em: string;
          removido_em: string | null;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          nome: string;
          ordem?: number;
          criado_em?: string;
          removido_em?: string | null;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          nome?: string;
          ordem?: number;
          criado_em?: string;
          removido_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pisos_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
        ];
      };
      regras_desempate: {
        Row: {
          id: string;
          edicao_id: string;
          ordem: number;
          descricao: string;
          tipo: string;
          rubrica_id: string | null;
          criterio_id: string | null;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          ordem: number;
          descricao: string;
          tipo: string;
          rubrica_id?: string | null;
          criterio_id?: string | null;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          ordem?: number;
          descricao?: string;
          tipo?: string;
          rubrica_id?: string | null;
          criterio_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "regras_desempate_criterio_id_fkey";
            columns: ["criterio_id"];
            isOneToOne: false;
            referencedRelation: "criterios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regras_desempate_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regras_desempate_rubrica_id_fkey";
            columns: ["rubrica_id"];
            isOneToOne: false;
            referencedRelation: "rubricas";
            referencedColumns: ["id"];
          },
        ];
      };
      rubricas: {
        Row: {
          id: string;
          edicao_id: string;
          fase_id: string;
          banca_id: string;
          codigo: string;
          parte: string | null;
          nome: string;
          curto: string;
          peso_final: number;
          momento: string | null;
          ordem: number;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          fase_id: string;
          banca_id: string;
          codigo: string;
          parte?: string | null;
          nome: string;
          curto: string;
          peso_final: number;
          momento?: string | null;
          ordem?: number;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          fase_id?: string;
          banca_id?: string;
          codigo?: string;
          parte?: string | null;
          nome?: string;
          curto?: string;
          peso_final?: number;
          momento?: string | null;
          ordem?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rubricas_banca_id_fkey";
            columns: ["banca_id"];
            isOneToOne: false;
            referencedRelation: "bancas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rubricas_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rubricas_fase_id_fkey";
            columns: ["fase_id"];
            isOneToOne: false;
            referencedRelation: "fases";
            referencedColumns: ["id"];
          },
        ];
      };
      salas: {
        Row: {
          id: string;
          edicao_id: string;
          piso_id: string;
          nome: string;
          largura_cm: number;
          profundidade_cm: number;
          fundo: string | null;
          ordem: number;
          criado_em: string;
          atualizado_em: string;
          removido_em: string | null;
        };
        Insert: {
          id?: string;
          edicao_id: string;
          piso_id: string;
          nome: string;
          largura_cm: number;
          profundidade_cm: number;
          fundo?: string | null;
          ordem?: number;
          criado_em?: string;
          atualizado_em?: string;
          removido_em?: string | null;
        };
        Update: {
          id?: string;
          edicao_id?: string;
          piso_id?: string;
          nome?: string;
          largura_cm?: number;
          profundidade_cm?: number;
          fundo?: string | null;
          ordem?: number;
          criado_em?: string;
          atualizado_em?: string;
          removido_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "salas_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "salas_piso_id_fkey";
            columns: ["piso_id"];
            isOneToOne: false;
            referencedRelation: "pisos";
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
          edicao_id: string;
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
          edicao_id: string;
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
          edicao_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trocas_edicao_id_fkey";
            columns: ["edicao_id"];
            isOneToOne: false;
            referencedRelation: "edicoes";
            referencedColumns: ["id"];
          },
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
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
          {
            foreignKeyName: "trocas_solicitante_fkey";
            columns: ["solicitante"];
            isOneToOne: false;
            referencedRelation: "pessoas";
            referencedColumns: ["email"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      aceitar_troca: { Args: { p_pedido: string; p_como?: string }; Returns: string };
      alocar_equipe: { Args: { p_equipe: string; p_elemento: string; p_lugar: number }; Returns: Json };
      analisar_equipe: { Args: { p_equipe: string; p_aprovar: boolean; p_motivo?: string }; Returns: undefined };
      aplicar_equipes: { Args: { p_equipes: Json; p_substituir?: boolean; p_edicao?: string }; Returns: number };
      arquivar_equipe: { Args: { p_equipe: string }; Returns: undefined };
      arquivar_ficha: { Args: { p_ficha: string }; Returns: undefined };
      atualizar_situacao_proposta: { Args: { p_equipe: string }; Returns: undefined };
      cancelar_proposta: { Args: { p_equipe: string; p_como?: string }; Returns: undefined };
      cancelar_troca: { Args: { p_pedido: string; p_como?: string }; Returns: undefined };
      convidar_integrante: { Args: { p_equipe: string; p_email: string; p_como?: string }; Returns: undefined };
      criar_edicao: { Args: { p_dados: Json; p_copiar_de?: string }; Returns: string };
      criar_equipe: { Args: { p_nome: string; p_repo: string; p_edicao?: string }; Returns: string };
      definir_edicao_atual: { Args: { p_edicao: string }; Returns: undefined };
      definir_regulamento: { Args: { p_edicao: string; p_json: Json }; Returns: undefined };
      desalocar_equipe: { Args: { p_equipe: string }; Returns: undefined };
      edicao_atual: { Args: Record<PropertyKey, never>; Returns: string };
      edicao_da_equipe: { Args: { p_equipe: string }; Returns: string };
      edicao_liberada: { Args: Record<PropertyKey, never>; Returns: boolean } | { Args: { p_edicao: string }; Returns: boolean };
      eh_avaliador: { Args: Record<PropertyKey, never>; Returns: boolean };
      eh_inscrito: { Args: Record<PropertyKey, never>; Returns: boolean };
      eh_organizador: { Args: Record<PropertyKey, never>; Returns: boolean };
      eh_organizador_de: { Args: { p_edicao: string }; Returns: boolean };
      email_atual: { Args: Record<PropertyKey, never>; Returns: string };
      equipe_ativa_de: { Args: { p_email: string; p_edicao: string }; Returns: string };
      exportar_mapa: { Args: { p_edicao: string }; Returns: Json };
      exportar_regulamento: { Args: { p_edicao: string }; Returns: Json };
      importar_mapa: { Args: { p_edicao: string; p_mapa: Json; p_substituir?: boolean }; Returns: Json };
      importar_regulamento: { Args: { p_edicao: string; p_json: Json }; Returns: undefined };
      minha_equipe: { Args: Record<PropertyKey, never>; Returns: string } | { Args: { p_edicao: string }; Returns: string };
      nome_de: { Args: { p_email: string }; Returns: string };
      normalizar_email: { Args: { p: string }; Returns: string };
      papel_atual: { Args: Record<PropertyKey, never>; Returns: string };
      papel_em: { Args: { p_edicao: string }; Returns: string };
      participa_de: { Args: { p_edicao: string }; Returns: boolean };
      pedir_troca: { Args: { p_destino: string; p_mensagem?: string; p_como?: string }; Returns: string };
      pode_avaliar: { Args: { p_rubrica: string }; Returns: boolean };
      propor_equipe: { Args: { p_nome: string; p_emails: string[]; p_repo?: string; p_como?: string }; Returns: string };
      quem_age: { Args: { p_como: string }; Returns: string };
      recusar_troca: { Args: { p_pedido: string; p_como?: string }; Returns: undefined };
      registrar_presenca: { Args: { p_edicao: string; p_email: string; p_presenca: string }; Returns: undefined };
      remover_integrante: { Args: { p_equipe: string; p_email: string }; Returns: undefined };
      responder_convite: { Args: { p_equipe: string; p_aceitar: boolean; p_como?: string }; Returns: undefined };
      salvar_ficha: { Args: { p_equipe: string; p_rubrica: string; p_notas: Json; p_comentario?: string }; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type Publico = Database["public"];
/** Linha de uma tabela: Linha<"equipes">. */
export type Linha<T extends keyof Publico["Tables"]> = Publico["Tables"][T]["Row"];
export type NovaLinha<T extends keyof Publico["Tables"]> = Publico["Tables"][T]["Insert"];
