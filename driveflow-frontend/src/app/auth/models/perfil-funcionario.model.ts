export interface PerfilFuncionario {
  username: string;
  email: string;
  numero_identificacion?: string;
  ciudad?: string;
  rh?: string;
  grupo_sanguineo?: string;
  nombres?: string;
  apellidos?: string;
  ano_nacimiento?: number;
  direccion?: string;
  telefono?: string;
  profile_image_url?: string;
  // Asociación a empresa (opcional)
  empresa_id_asociada?: number | null;
  empresa_nombre_asociada?: string | null;
}
