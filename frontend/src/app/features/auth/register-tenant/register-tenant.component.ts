import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register-tenant',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-tenant.component.html',
  styleUrl: './register-tenant.component.scss'
})
export class RegisterTenantComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    tenantName: ['', Validators.required],
    tenantCode: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,50}$/)]],
    adminFullName: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly errorMessage = signal<string | null>(null);
  readonly loading = signal(false);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);

    this.authService.registerTenant(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.status === 409 ? "Ce code d'établissement est déjà utilisé." : 'Une erreur est survenue.'
        );
      }
    });
  }
}
