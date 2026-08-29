import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JsonPipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

interface PingResponse {
  message: string;
  email: string;
  role: string;
  tenantId: string | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly ping = signal<PingResponse | null>(null);

  constructor(
    private readonly http: HttpClient,
    readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.http.get<PingResponse>(`${environment.apiUrl}/ping`).subscribe((response) => this.ping.set(response));
  }

  logout(): void {
    this.authService.logout();
  }
}
