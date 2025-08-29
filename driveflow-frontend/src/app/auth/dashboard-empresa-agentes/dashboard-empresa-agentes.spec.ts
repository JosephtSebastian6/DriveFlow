import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardEmpresaAgentes } from './dashboard-empresa-agentes';

describe('DashboardEmpresaAgentes', () => {
  let component: DashboardEmpresaAgentes;
  let fixture: ComponentFixture<DashboardEmpresaAgentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardEmpresaAgentes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardEmpresaAgentes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
