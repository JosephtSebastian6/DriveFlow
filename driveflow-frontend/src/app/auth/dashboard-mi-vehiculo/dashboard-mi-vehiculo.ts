import { Component, OnInit } from '@angular/core';
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
export class DashboardMiVehiculoComponent implements OnInit {
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

  onSubmitVehiculo() {
    const username = localStorage.getItem('username');
    if (!username) return;
    const data = { ...this.vehiculo };
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
    const fecha = new Date(this.vehiculo.fecha_soat);
    fecha.setFullYear(fecha.getFullYear() + 1);
    return fecha.toLocaleDateString();
  }

  getTecnoVenceEn(): string {
    if (!this.vehiculo.fecha_tecno) return '';
    const fecha = new Date(this.vehiculo.fecha_tecno);
    fecha.setFullYear(fecha.getFullYear() + 1);
    return fecha.toLocaleDateString();
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
}
