import { TestBed } from '@angular/core/testing';
import { FeesService } from './fees.service';
import { ALL_CLASSES } from '../models/jangpay.models';

describe('FeesService', () => {
  let service: FeesService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FeesService] });
    service = TestBed.inject(FeesService);
  });

  it('création d’un frais : apparaît dans la liste avec un identifiant unique', () => {
    const before = service.filteredSorted().length;
    service.addFee({
      name: 'Frais de laboratoire',
      category: 'AUTRES',
      description: 'Sciences',
      amount: 8000,
      academicYear: '2026-2027',
      classLevel: ALL_CLASSES,
      startDate: '2026-09-01',
      dueDate: '2026-10-01',
      status: 'ACTIVE',
      mandatory: false
    });

    const all = service.filteredSorted();
    expect(all.length).toBe(before + 1);
    const created = all.find((f) => f.name === 'Frais de laboratoire');
    expect(created).toBeDefined();
    expect(created?.id).toBeTruthy();
    expect(created?.amount).toBe(8000);
  });

  it('modification d’un frais : les champs sont mis à jour sans changer l’identifiant', () => {
    const target = service.filteredSorted()[0];
    service.updateFee(target.id, {
      ...target,
      name: 'Nom modifié',
      amount: 99999
    });

    const updated = service.filteredSorted().find((f) => f.id === target.id);
    expect(updated?.id).toBe(target.id);
    expect(updated?.name).toBe('Nom modifié');
    expect(updated?.amount).toBe(99999);
  });

  it('désactivation puis réactivation bascule le statut', () => {
    const target = service.filteredSorted().find((f) => f.status === 'ACTIVE')!;
    service.toggleStatus(target.id);
    expect(service.filteredSorted().find((f) => f.id === target.id)?.status).toBe('INACTIVE');

    service.toggleStatus(target.id);
    expect(service.filteredSorted().find((f) => f.id === target.id)?.status).toBe('ACTIVE');
  });

  it('suppression retire le frais de la liste', () => {
    const target = service.filteredSorted()[0];
    const before = service.filteredSorted().length;
    service.deleteFee(target.id);
    expect(service.filteredSorted().length).toBe(before - 1);
    expect(service.filteredSorted().find((f) => f.id === target.id)).toBeUndefined();
  });

  it('la recherche filtre par nom (insensible à la casse)', () => {
    service.setSearch('cantine');
    const results = service.filteredSorted();
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((f) => f.name.toLowerCase().includes('cantine'))).toBeTrue();
  });

  it('un filtre sans résultat retourne une liste vide (cas limite)', () => {
    service.setSearch('ce-nom-n-existe-pas-xyz');
    expect(service.filteredSorted().length).toBe(0);
    expect(service.pagedFees().length).toBe(0);
  });
});
