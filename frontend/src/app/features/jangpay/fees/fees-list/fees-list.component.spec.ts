import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FeesListComponent } from './fees-list.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthResponse } from '../../../../core/auth/auth.models';

function userWithRole(role: string): AuthResponse {
  return { token: 't', userId: 'u1', tenantId: 'tenant-1', role, fullName: 'Test User', email: 'test@example.sn' };
}

describe('FeesListComponent — permissions', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FeesListComponent>>;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FeesListComponent],
      providers: [provideHttpClient(), provideRouter([])]
    });
    fixture = TestBed.createComponent(FeesListComponent);
    auth = TestBed.inject(AuthService);
  });

  it('permissions Administrateur : peut supprimer un frais', () => {
    auth.currentUser.set(userWithRole('TENANT_ADMIN'));
    expect(fixture.componentInstance.canDelete()).toBeTrue();
  });

  it('permissions Comptable : ne peut pas supprimer un frais', () => {
    auth.currentUser.set(userWithRole('ACCOUNTANT'));
    expect(fixture.componentInstance.canDelete()).toBeFalse();
  });

  it('permissions Parent : ne peut pas supprimer un frais', () => {
    auth.currentUser.set(userWithRole('PARENT'));
    expect(fixture.componentInstance.canDelete()).toBeFalse();
  });

  it('utilisateur non autorisé (aucune session) : ne peut pas supprimer un frais', () => {
    auth.currentUser.set(null);
    expect(fixture.componentInstance.canDelete()).toBeFalse();
  });

  it('rôle inconnu : refusé par défaut (fail-closed)', () => {
    auth.currentUser.set(userWithRole('UNKNOWN_ROLE'));
    expect(fixture.componentInstance.canDelete()).toBeFalse();
  });
});
