import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardClienteService } from '../dashboard-cliente/dashboard-cliente.service';

@Component({
  selector: 'app-dashboard-mi-vehiculo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-mi-vehiculo.html',
  styleUrls: ['./dashboard-mi-vehiculo.css']
})
export class DashboardMiVehiculoComponent implements OnInit, OnDestroy {
  // Formulario del vehículo actualmente seleccionado/edición
  vehiculo = {
    marca: '',
    modelo: '',
    ano: '',
    placa: '',
    fecha_soat: '',
    fecha_tecno: '',
    color: '',
    vehiculo_image_url: ''
  };
  mensajeVehiculo = '';
  // Validación de fechas
  soatError: string | null = null;
  tecnoError: string | null = null;

  // Estado para múltiples vehículos
  vehiculos: any[] = [];
  vehiculoSeleccionadoId: number | null = null;

  // Adjuntos de imágenes por placa (localStorage)
  images: { id: string; name: string; dataUrl: string; createdAt: number }[] = [];
  uploadBusy = false;
  uploadError: string | null = null;
  private imagesStorageKey = '';
  // Adjuntos específicos (SOAT, Tecnomecánica, Licencia)
  soatImage: { name: string; dataUrl: string; createdAt: number } | null = null;
  tecnoImage: { name: string; dataUrl: string; createdAt: number } | null = null;
  licenciaImage: { name: string; dataUrl: string; createdAt: number } | null = null;

  // Modal de previsualización
  preview: { src: string; name?: string } | null = null;

  // Polling para detectar asignaciones nuevas
  private pollHandle: any = null;

  constructor(private dashboardClienteService: DashboardClienteService) {}

  ngOnInit() {
    const username = localStorage.getItem('username');
    if (!username) return;

    this.dashboardClienteService.listarVehiculos(username).subscribe({
      next: (lista: any[]) => {
        this.vehiculos = Array.isArray(lista) ? lista : [];
        if (this.vehiculos.length > 0) {
          const primero = this.vehiculos[0];
          this.vehiculoSeleccionadoId = primero.id;
          this.vehiculo = this.mapFromApi(primero);
        } else {
          this.dashboardClienteService.getVehiculo(username).subscribe({
            next: (data: any) => {
              this.vehiculo = { ...this.vehiculo, ...data };
              this.vehiculoSeleccionadoId = null;
            }
          });
        }
        this.initImagesStorageForCurrent();
      },
      error: () => {
        this.dashboardClienteService.getVehiculo(username).subscribe({
          next: (data: any) => {
            this.vehiculo = { ...this.vehiculo, ...data };
            this.vehiculoSeleccionadoId = null;
            this.initImagesStorageForCurrent();
          }
        });
      }
    });

    // Iniciar polling de asignaciones nuevas (cada 20s)
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private startPolling() {
    const username = localStorage.getItem('username');
    if (!username) return;
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.pollHandle = setInterval(() => {
      this.dashboardClienteService.listarVehiculos(username).subscribe({
        next: (lista: any[]) => {
          const nueva = Array.isArray(lista) ? lista : [];
          if (!this.areVehiculoListsEqual(this.vehiculos, nueva)) {
            this.vehiculos = nueva;
            // Si selección actual ya no existe o no había selección, escoger el primero
            const exists = this.vehiculoSeleccionadoId != null && this.vehiculos.some(v => v.id === this.vehiculoSeleccionadoId);
            const nextId = exists ? this.vehiculoSeleccionadoId! : (this.vehiculos[0]?.id ?? null);
            if (nextId != null) {
              this.seleccionarVehiculo(nextId);
            } else {
              // Sin vehículos: mantener formulario vacío
              this.nuevoVehiculo();
            }
          }
        },
        error: () => {}
      });
    }, 20000);
  }

  private areVehiculoListsEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    const ak = [...a].map(x => `${x.id}|${x.placa}|${x.modelo}|${x.color}`).sort().join('||');
    const bk = [...b].map(x => `${x.id}|${x.placa}|${x.modelo}|${x.color}`).sort().join('||');
    return ak === bk;
  }

  // ====== Adjuntos: almacenamiento en localStorage ======
  private initImagesStorageForCurrent() {
    const username = localStorage.getItem('username') || 'anon';
    const placaKey = (this.vehiculo.placa || 'sinplaca').toUpperCase();
    this.imagesStorageKey = `vehiculo_images_${username}_${placaKey}`;
    this.loadImagesFromStorage();
    // Cargar adjuntos específicos
    this.loadSingleFromStorage('SOAT');
    this.loadSingleFromStorage('TECNO');
    this.loadSingleFromStorage('LICENCIA');
  }

  private loadImagesFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.imagesStorageKey);
      this.images = raw ? JSON.parse(raw) : [];
    } catch {
      this.images = [];
    }
  }

  private persistImages(): void {
    try {
      localStorage.setItem(this.imagesStorageKey, JSON.stringify(this.images));
    } catch (e) {
      console.error('No se pudieron guardar las imágenes', e);
    }
  }

  // ====== Adjuntos específicos (uno por tipo) ======
  private getSingleKey(type: 'SOAT' | 'TECNO' | 'LICENCIA'): string {
    const username = localStorage.getItem('username') || 'anon';
    const placaKey = (this.vehiculo.placa || 'sinplaca').toUpperCase();
    return `vehiculo_single_${type}_${username}_${placaKey}`;
  }

  private loadSingleFromStorage(type: 'SOAT' | 'TECNO' | 'LICENCIA') {
    try {
      const raw = localStorage.getItem(this.getSingleKey(type));
      const obj = raw ? JSON.parse(raw) : null;
      if (type === 'SOAT') this.soatImage = obj;
      if (type === 'TECNO') this.tecnoImage = obj;
      if (type === 'LICENCIA') this.licenciaImage = obj;
    } catch {
      if (type === 'SOAT') this.soatImage = null;
      if (type === 'TECNO') this.tecnoImage = null;
      if (type === 'LICENCIA') this.licenciaImage = null;
    }
  }

  private persistSingle(type: 'SOAT' | 'TECNO' | 'LICENCIA') {
    try {
      const data = type === 'SOAT' ? this.soatImage : type === 'TECNO' ? this.tecnoImage : this.licenciaImage;
      localStorage.setItem(this.getSingleKey(type), JSON.stringify(data));
    } catch (e) {
      console.error('No se pudo guardar el adjunto', type, e);
    }
  }

  async onSingleSelected(event: any, type: 'SOAT' | 'TECNO' | 'LICENCIA') {
    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const maxSizeMB = 3;
    if (file.size > maxSizeMB * 1024 * 1024) { this.uploadError = `Imagen demasiado grande: ${file.name}`; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const item = { name: file.name, dataUrl, createdAt: Date.now() };
      if (type === 'SOAT') this.soatImage = item;
      if (type === 'TECNO') this.tecnoImage = item;
      if (type === 'LICENCIA') this.licenciaImage = item;
      this.persistSingle(type);
    };
    reader.readAsDataURL(file);
    try { event.target.value = ''; } catch {}
  }

  removeSingle(type: 'SOAT' | 'TECNO' | 'LICENCIA') {
    if (type === 'SOAT') this.soatImage = null;
    if (type === 'TECNO') this.tecnoImage = null;
    if (type === 'LICENCIA') this.licenciaImage = null;
    this.persistSingle(type);
  }

  async onFilesSelected(event: any) {
    const files: FileList | null = event?.target?.files || null;
    if (!files || files.length === 0) return;
    this.uploadBusy = true;
    this.uploadError = null;
    const maxSizeMB = 3;
    const tasks: Promise<void>[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      if (f.size > maxSizeMB * 1024 * 1024) { this.uploadError = `Imagen demasiado grande: ${f.name}`; continue; }
      tasks.push(new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          this.images.unshift({ id: `${Date.now()}_${i}`, name: f.name, dataUrl, createdAt: Date.now() });
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(f);
      }));
    }
    await Promise.all(tasks);
    this.persistImages();
    this.uploadBusy = false;
    try { event.target.value = ''; } catch {}
  }

  removeImage(id: string) {
    this.images = this.images.filter(img => img.id !== id);
    this.persistImages();
  }

  // ====== Modal Preview ======
  openPreview(src: string, name?: string) {
    if (!src) return;
    this.preview = { src, name };
    // Evitar scroll del body mientras el modal está abierto (opcional)
    try { document.body.style.overflow = 'hidden'; } catch {}
  }

  closePreview() {
    this.preview = null;
    try { document.body.style.overflow = ''; } catch {}
  }

  onSubmitVehiculo() {
    const username = localStorage.getItem('username');
    if (!username) return;
    // Normalizar fechas: interpretar como fecha de emisión y guardar en ISO YYYY-MM-DD
    const data = { ...this.vehiculo } as any;
    const soatParsed = this.parseDateFlexible(this.vehiculo.fecha_soat);
    const tecnoParsed = this.parseDateFlexible(this.vehiculo.fecha_tecno);
    this.soatError = this.vehiculo.fecha_soat && !soatParsed ? 'Fecha SOAT inválida' : null;
    this.tecnoError = this.vehiculo.fecha_tecno && !tecnoParsed ? 'Fecha Tecnomecánica inválida' : null;
    if (this.soatError || this.tecnoError) {
      this.mensajeVehiculo = 'Corrige las fechas antes de guardar.';
      setTimeout(() => this.mensajeVehiculo = '', 3000);
      return;
    }
    if (soatParsed) data.fecha_soat = this.formatISO(soatParsed);
    if (tecnoParsed) data.fecha_tecno = this.formatISO(tecnoParsed);
    const obs = this.vehiculoSeleccionadoId != null
      ? this.dashboardClienteService.actualizarVehiculo(this.vehiculoSeleccionadoId, data)
      : this.dashboardClienteService.crearVehiculo(username, data);
    obs.subscribe({
      next: (saved: any) => {
        this.mensajeVehiculo = '¡Vehículo guardado correctamente!';
        setTimeout(() => this.mensajeVehiculo = '', 3000);
        this.refrescarListaYSeleccionar(username, saved?.id);
      },
      error: () => {
        this.mensajeVehiculo = 'Error al guardar el vehículo.';
        setTimeout(() => this.mensajeVehiculo = '', 3000);
      }
    });
  }

  getSoatVenceEn(): string {
    if (!this.vehiculo.fecha_soat) return '';
    const base = this.parseDateFlexible(this.vehiculo.fecha_soat);
    if (!base) { this.soatError = 'Fecha SOAT inválida'; return ''; }
    this.soatError = null;
    const expiry = this.addOneYear(base);
    return expiry.toLocaleDateString();
  }

  getTecnoVenceEn(): string {
    if (!this.vehiculo.fecha_tecno) return '';
    const base = this.parseDateFlexible(this.vehiculo.fecha_tecno);
    if (!base) { this.tecnoError = 'Fecha Tecnomecánica inválida'; return ''; }
    this.tecnoError = null;
    const expiry = this.addOneYear(base);
    return expiry.toLocaleDateString();
  }

  seleccionarVehiculo(id: number) {
    const v = this.vehiculos.find(x => x.id === id);
    if (!v) return;
    this.vehiculoSeleccionadoId = id;
    this.vehiculo = this.mapFromApi(v);
    this.initImagesStorageForCurrent();
  }

  nuevoVehiculo() {
    this.vehiculoSeleccionadoId = null;
    this.vehiculo = { marca: '', modelo: '', ano: '', placa: '', fecha_soat: '', fecha_tecno: '', color: '', vehiculo_image_url: '' };
    this.initImagesStorageForCurrent();
  }

  eliminarVehiculo() {
    if (this.vehiculoSeleccionadoId == null) return;
    this.dashboardClienteService.eliminarVehiculo(this.vehiculoSeleccionadoId).subscribe({
      next: () => {
        const username = localStorage.getItem('username')!;
        this.refrescarListaYSeleccionar(username, null);
      }
    });
  }

  private refrescarListaYSeleccionar(username: string, idSeleccion?: number | null) {
    this.dashboardClienteService.listarVehiculos(username).subscribe((lista: any[]) => {
      this.vehiculos = Array.isArray(lista) ? lista : [];
      if (this.vehiculos.length === 0) {
        this.nuevoVehiculo();
        return;
      }
      const id = idSeleccion ?? this.vehiculos[0].id;
      this.seleccionarVehiculo(id);
    });
  }

  private mapFromApi(v: any) {
    return {
      marca: v.marca || '',
      modelo: v.modelo || '',
      ano: v.ano || '',
      placa: v.placa || '',
      fecha_soat: v.fecha_soat || '',
      fecha_tecno: v.fecha_tecno || '',
      color: v.color || '',
      vehiculo_image_url: v.vehiculo_image_url || ''
    };
  }

  // ==== Helpers de fechas ====
  private parseDateFlexible(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const s = value.toString().trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(s)) {
      const d = new Date(s + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const m = s.match(dmy);
    if (m) {
      const day = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const d = new Date(year, mon, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  private addOneYear(d: Date): Date {
    const y = d.getFullYear() + 1;
    const m = d.getMonth();
    const day = d.getDate();
    const cand = new Date(y, m, day);
    if (cand.getMonth() !== m) return new Date(y, m + 1, 0);
    return cand;
  }

  private formatISO(d: Date): string {
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  }
}
