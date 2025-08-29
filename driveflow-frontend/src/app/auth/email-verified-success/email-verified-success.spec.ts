import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailVerifiedSuccessComponent } from './email-verified-success';

describe('EmailVerifiedSuccess', () => {
  let component: EmailVerifiedSuccessComponent;
  let fixture: ComponentFixture<EmailVerifiedSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailVerifiedSuccessComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailVerifiedSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
