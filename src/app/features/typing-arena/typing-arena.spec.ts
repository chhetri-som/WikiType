import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypingArena } from './typing-arena';

describe('TypingArena', () => {
  let component: TypingArena;
  let fixture: ComponentFixture<TypingArena>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypingArena],
    }).compileComponents();

    fixture = TestBed.createComponent(TypingArena);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
