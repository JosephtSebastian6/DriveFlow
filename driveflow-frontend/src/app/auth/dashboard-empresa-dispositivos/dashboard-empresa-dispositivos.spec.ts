import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardEmpresaDispositivos } from './dashboard-empresa-dispositivos';

describe('DashboardEmpresaDispositivos', () => {
  let component: DashboardEmpresaDispositivos;
  let fixture: ComponentFixture<DashboardEmpresaDispositivos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardEmpresaDispositivos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardEmpresaDispositivos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
