import { TestBed } from '@angular/core/testing';
import { TypingEngine } from './typing-engine';

describe('TypingEngine', () => {
  let service: TypingEngine;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TypingEngine);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
