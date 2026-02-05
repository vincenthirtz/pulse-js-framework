/**
 * Pulse Documentation - Migration from Angular Page
 */

import { el } from '/runtime/index.js';
import { t, navigateLocale } from '../state.js';

export function MigrationAngularPage() {
  const page = el('.page.docs-page.migration-page');

  page.innerHTML = `
    <h1>${t('migrationAngular.title')}</h1>
    <p class="intro">${t('migrationAngular.intro')}</p>

    <!-- Quick Comparison -->
    <section class="doc-section">
      <h2>${t('migrationAngular.quickComparison')}</h2>
      <p>${t('migrationAngular.quickComparisonDesc')}</p>

      <div class="comparison-grid">
        <div class="comparison-box angular-box">
          <div class="comparison-header">
            <span class="framework-icon">🅰️</span>
            <h3>Angular</h3>
          </div>
          <ul>
            <li>Component-based with decorators</li>
            <li>TypeScript required</li>
            <li>RxJS observables</li>
            <li>~130kb+ gzipped</li>
            <li>CLI required</li>
          </ul>
        </div>
        <div class="comparison-box pulse-box">
          <div class="comparison-header">
            <span class="framework-icon">⚡</span>
            <h3>Pulse</h3>
          </div>
          <ul>
            <li>Functions with CSS selectors</li>
            <li>TypeScript optional</li>
            <li>Pulse signals</li>
            <li>~4kb gzipped</li>
            <li>No build required</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Component Structure -->
    <section class="doc-section">
      <h2>${t('migrationAngular.componentStructure')}</h2>
      <p>${t('migrationAngular.componentStructureDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular - Component</div>
          <pre><code>import { Component } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: \`
    &lt;div class="counter"&gt;
      &lt;h1&gt;Count: {{ count }}&lt;/h1&gt;
      &lt;button (click)="increment()"&gt;
        Increment
      &lt;/button&gt;
    &lt;/div&gt;
  \`,
  styles: [\`.counter { padding: 20px }\`]
})
export class CounterComponent {
  count = 0;

  increment() {
    this.count++;
  }
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Function</div>
          <pre><code>import { pulse, effect, el } from 'pulse-js-framework';

function Counter() {
  const count = pulse(0);
  const div = el('.counter');

  const h1 = el('h1');
  effect(() => {
    h1.textContent = \`Count: \${count.get()}\`;
  });

  const btn = el('button', 'Increment');
  btn.onclick = () => count.update(c => c + 1);

  div.append(h1, btn);
  return div;
}</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationAngular.tip')}:</strong> ${t('migrationAngular.componentTip')}
      </div>
    </section>

    <!-- Property Binding -->
    <section class="doc-section">
      <h2>${t('migrationAngular.propertyBinding')}</h2>
      <p>${t('migrationAngular.propertyBindingDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular - Property Binding</div>
          <pre><code>&lt;!-- One-way binding --&gt;
&lt;img [src]="imageUrl" [alt]="imageAlt"&gt;

&lt;!-- Two-way binding --&gt;
&lt;input [(ngModel)]="username"&gt;

&lt;!-- Class binding --&gt;
&lt;div [class.active]="isActive"&gt;
&lt;div [ngClass]="{'active': isActive, 'disabled': isDisabled}"&gt;

&lt;!-- Style binding --&gt;
&lt;div [style.color]="textColor"&gt;
&lt;div [ngStyle]="{'color': textColor, 'font-size': fontSize}"&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Bindings</div>
          <pre><code>import { pulse, effect, el, bind, model } from 'pulse-js-framework';

// One-way binding
const img = el('img');
effect(() => {
  img.src = imageUrl.get();
  img.alt = imageAlt.get();
});

// Two-way binding
const input = el('input');
model(input, username);

// Class binding
const div = el('div');
bind(div, 'class', () => isActive.get() ? 'active' : '');

// Style binding
effect(() => {
  div.style.color = textColor.get();
  div.style.fontSize = fontSize.get();
});</code></pre>
        </div>
      </div>
    </section>

    <!-- Observables vs Pulses -->
    <section class="doc-section">
      <h2>${t('migrationAngular.observables')}</h2>
      <p>${t('migrationAngular.observablesDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular - RxJS Observables</div>
          <pre><code>import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({...})
export class UserComponent implements OnInit, OnDestroy {
  private subscription: Subscription;

  count$ = new BehaviorSubject(0);
  multiplier$ = new BehaviorSubject(2);

  // Derived value
  doubled$ = combineLatest([this.count$, this.multiplier$]).pipe(
    map(([count, mult]) => count * mult)
  );

  ngOnInit() {
    this.subscription = this.doubled$.subscribe(
      value => console.log('Doubled:', value)
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  increment() {
    this.count$.next(this.count$.value + 1);
  }
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Signals</div>
          <pre><code>import { pulse, computed, effect } from 'pulse-js-framework';

function UserComponent() {
  const count = pulse(0);
  const multiplier = pulse(2);

  // Derived value - auto-tracks dependencies
  const doubled = computed(() =>
    count.get() * multiplier.get()
  );

  // Auto-cleanup when component unmounts
  effect(() => {
    console.log('Doubled:', doubled.get());
  });

  function increment() {
    count.update(c => c + 1);
  }

  // No manual subscription management!
  // No OnDestroy cleanup needed!
}</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationAngular.tip')}:</strong> ${t('migrationAngular.observablesTip')}
      </div>
    </section>

    <!-- Dependency Injection vs Imports -->
    <section class="doc-section">
      <h2>${t('migrationAngular.dependencyInjection')}</h2>
      <p>${t('migrationAngular.dependencyInjectionDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular - DI</div>
          <pre><code>// user.service.ts
@Injectable({ providedIn: 'root' })
export class UserService {
  private users$ = new BehaviorSubject&lt;User[]&gt;([]);

  getUsers() {
    return this.http.get&lt;User[]&gt;('/api/users')
      .pipe(tap(users => this.users$.next(users)));
  }
}

// user.component.ts
@Component({...})
export class UserComponent {
  constructor(private userService: UserService) {}

  ngOnInit() {
    this.userService.getUsers().subscribe();
  }
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Imports</div>
          <pre><code>// userStore.js
import { pulse } from 'pulse-js-framework';
import { createHttp } from 'pulse-js-framework/runtime/http';

const http = createHttp({ baseURL: '/api' });
export const users = pulse([]);

export async function fetchUsers() {
  const response = await http.get('/users');
  users.set(response.data);
}

// UserComponent.js
import { users, fetchUsers } from './userStore.js';

function UserComponent() {
  // Just import and use!
  fetchUsers();
  // users.get() anywhere
}</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationAngular.tip')}:</strong> ${t('migrationAngular.diTip')}
      </div>
    </section>

    <!-- Directives -->
    <section class="doc-section">
      <h2>${t('migrationAngular.directives')}</h2>
      <p>${t('migrationAngular.directivesDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular - ngIf / ngFor</div>
          <pre><code>&lt;!-- Conditional rendering --&gt;
&lt;div *ngIf="isLoading; else content"&gt;
  Loading...
&lt;/div&gt;
&lt;ng-template #content&gt;
  &lt;p&gt;{{ user.name }}&lt;/p&gt;
&lt;/ng-template&gt;

&lt;!-- List rendering --&gt;
&lt;ul&gt;
  &lt;li *ngFor="let item of items; trackBy: trackById"&gt;
    {{ item.name }}
  &lt;/li&gt;
&lt;/ul&gt;

&lt;!-- Switch --&gt;
&lt;div [ngSwitch]="status"&gt;
  &lt;p *ngSwitchCase="'loading'"&gt;Loading...&lt;/p&gt;
  &lt;p *ngSwitchCase="'error'"&gt;Error!&lt;/p&gt;
  &lt;p *ngSwitchDefault&gt;Ready&lt;/p&gt;
&lt;/div&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - when / list</div>
          <pre><code>import { when, list, el, pulse } from 'pulse-js-framework';

// Conditional rendering
when(
  () => isLoading.get(),
  () => el('.loading', 'Loading...'),
  () => el('p', user.get().name)
);

// List rendering
const ul = el('ul');
list(
  () => items.get(),
  item => el('li', item.name),
  item => item.id  // trackBy equivalent
);

// Switch (use nested when or computed)
const content = computed(() => {
  switch (status.get()) {
    case 'loading': return 'Loading...';
    case 'error': return 'Error!';
    default: return 'Ready';
  }
});
el('p', () => content.get());</code></pre>
        </div>
      </div>
    </section>

    <!-- Forms -->
    <section class="doc-section">
      <h2>${t('migrationAngular.forms')}</h2>
      <p>${t('migrationAngular.formsDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular - Reactive Forms</div>
          <pre><code>import { FormBuilder, Validators } from '@angular/forms';

@Component({...})
export class LoginComponent {
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(private fb: FormBuilder) {}

  onSubmit() {
    if (this.loginForm.valid) {
      console.log(this.loginForm.value);
    }
  }
}

// Template
&lt;form [formGroup]="loginForm" (ngSubmit)="onSubmit()"&gt;
  &lt;input formControlName="email"&gt;
  &lt;span *ngIf="loginForm.get('email').errors?.required"&gt;
    Required
  &lt;/span&gt;

  &lt;input type="password" formControlName="password"&gt;

  &lt;button [disabled]="!loginForm.valid"&gt;Login&lt;/button&gt;
&lt;/form&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - useForm</div>
          <pre><code>import { useForm, validators, el, model } from 'pulse-js-framework';

function LoginComponent() {
  const { fields, handleSubmit, isValid } = useForm(
    { email: '', password: '' },
    {
      email: [validators.required(), validators.email()],
      password: [validators.required(), validators.minLength(8)]
    },
    { onSubmit: (values) => console.log(values) }
  );

  const form = el('form');

  const emailInput = el('input[type=email]');
  model(emailInput, fields.email.value);
  form.appendChild(emailInput);

  when(
    () => fields.email.error.get(),
    () => el('span.error', fields.email.error.get())
  );

  const pwInput = el('input[type=password]');
  model(pwInput, fields.password.value);
  form.appendChild(pwInput);

  const btn = el('button[type=submit]', 'Login');
  effect(() => btn.disabled = !isValid.get());
  form.appendChild(btn);

  form.onsubmit = handleSubmit;
  return form;
}</code></pre>
        </div>
      </div>
    </section>

    <!-- Routing -->
    <section class="doc-section">
      <h2>${t('migrationAngular.routing')}</h2>
      <p>${t('migrationAngular.routingDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular Router</div>
          <pre><code>// app-routing.module.ts
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users', component: UsersComponent },
  { path: 'users/:id', component: UserDetailComponent },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module')
      .then(m => m.AdminModule),
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}

// Template
&lt;nav&gt;
  &lt;a routerLink="/"&gt;Home&lt;/a&gt;
  &lt;a routerLink="/users"&gt;Users&lt;/a&gt;
&lt;/nav&gt;
&lt;router-outlet&gt;&lt;/router-outlet&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse Router</div>
          <pre><code>import { createRouter, lazy } from 'pulse-js-framework';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/users': UsersPage,
    '/users/:id': UserDetailPage,
    '/admin': {
      handler: lazy(() => import('./AdminPage.js')),
      beforeEnter: (to, from) => {
        if (!isAuth()) return '/login';
      }
    }
  },
  mode: 'history'
});

// Navigation
const nav = el('nav');
nav.appendChild(el('a[href=/]', 'Home'));
nav.appendChild(el('a[href=/users]', 'Users'));

// Mount outlet
router.outlet('#app');

// Programmatic navigation
router.navigate('/users/123');
router.params.get(); // { id: '123' }</code></pre>
        </div>
      </div>
    </section>

    <!-- HTTP -->
    <section class="doc-section">
      <h2>${t('migrationAngular.http')}</h2>
      <p>${t('migrationAngular.httpDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular HttpClient</div>
          <pre><code>import { HttpClient, HttpInterceptor } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req, next) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + token)
    });
    return next.handle(authReq);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getUsers() {
    return this.http.get&lt;User[]&gt;('/api/users');
  }

  createUser(user: User) {
    return this.http.post&lt;User&gt;('/api/users', user);
  }
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse HTTP</div>
          <pre><code>import { createHttp } from 'pulse-js-framework/runtime/http';

const api = createHttp({
  baseURL: '/api',
  timeout: 5000
});

// Interceptor
api.interceptors.request.use(config => {
  config.headers['Authorization'] = 'Bearer ' + token;
  return config;
});

// Usage - returns promises (not observables)
async function getUsers() {
  const response = await api.get('/users');
  return response.data;
}

async function createUser(user) {
  const response = await api.post('/users', user);
  return response.data;
}

// Or use reactive wrapper
const { data, loading, error } = useHttp(
  () => api.get('/users')
);</code></pre>
        </div>
      </div>
    </section>

    <!-- Pipes vs Computed -->
    <section class="doc-section">
      <h2>${t('migrationAngular.pipes')}</h2>
      <p>${t('migrationAngular.pipesDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">🅰️ Angular - Pipes</div>
          <pre><code>&lt;!-- Built-in pipes --&gt;
&lt;p&gt;{{ price | currency:'EUR' }}&lt;/p&gt;
&lt;p&gt;{{ date | date:'longDate' }}&lt;/p&gt;
&lt;p&gt;{{ name | uppercase }}&lt;/p&gt;
&lt;p&gt;{{ items | async }}&lt;/p&gt;

&lt;!-- Custom pipe --&gt;
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number): string {
    return value.length > limit
      ? value.slice(0, limit) + '...'
      : value;
  }
}

// Usage
&lt;p&gt;{{ description | truncate:100 }}&lt;/p&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - computed</div>
          <pre><code>import { computed, effect, el } from 'pulse-js-framework';

// Computed values for transformations
const formattedPrice = computed(() =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price.get())
);

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long'
  }).format(date.get())
);

const upperName = computed(() =>
  name.get().toUpperCase()
);

// Custom "pipe" as function
function truncate(text, limit) {
  return text.length > limit
    ? text.slice(0, limit) + '...'
    : text;
}

const truncatedDesc = computed(() =>
  truncate(description.get(), 100)
);</code></pre>
        </div>
      </div>
    </section>

    <!-- Cheat Sheet -->
    <section class="doc-section">
      <h2>${t('migrationAngular.cheatSheet')}</h2>
      <p>${t('migrationAngular.cheatSheetDesc')}</p>

      <div class="cheat-sheet">
        <table>
          <thead>
            <tr>
              <th>Angular</th>
              <th>Pulse</th>
              <th>${t('migrationAngular.notes')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>@Component({...})</code></td>
              <td><code>function Component()</code></td>
              <td>${t('migrationAngular.cheatComponent')}</td>
            </tr>
            <tr>
              <td><code>BehaviorSubject(0)</code></td>
              <td><code>pulse(0)</code></td>
              <td>${t('migrationAngular.cheatSignal')}</td>
            </tr>
            <tr>
              <td><code>subject$.next(value)</code></td>
              <td><code>pulse.set(value)</code></td>
              <td>${t('migrationAngular.cheatEmit')}</td>
            </tr>
            <tr>
              <td><code>subject$.subscribe()</code></td>
              <td><code>effect(() => pulse.get())</code></td>
              <td>${t('migrationAngular.cheatSubscribe')}</td>
            </tr>
            <tr>
              <td><code>combineLatest().pipe(map())</code></td>
              <td><code>computed(() => ...)</code></td>
              <td>${t('migrationAngular.cheatDerived')}</td>
            </tr>
            <tr>
              <td><code>*ngIf="condition"</code></td>
              <td><code>when(() => cond, ...)</code></td>
              <td>${t('migrationAngular.cheatIf')}</td>
            </tr>
            <tr>
              <td><code>*ngFor="let x of items"</code></td>
              <td><code>list(() => items, ...)</code></td>
              <td>${t('migrationAngular.cheatFor')}</td>
            </tr>
            <tr>
              <td><code>[(ngModel)]="value"</code></td>
              <td><code>model(input, value)</code></td>
              <td>${t('migrationAngular.cheatModel')}</td>
            </tr>
            <tr>
              <td><code>[class.active]="isActive"</code></td>
              <td><code>bind(el, 'class', () => ...)</code></td>
              <td>${t('migrationAngular.cheatBind')}</td>
            </tr>
            <tr>
              <td><code>@Injectable service</code></td>
              <td><code>export const store</code></td>
              <td>${t('migrationAngular.cheatService')}</td>
            </tr>
            <tr>
              <td><code>| async</code></td>
              <td><code>effect(() => ...)</code></td>
              <td>${t('migrationAngular.cheatAsync')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Step by Step Migration -->
    <section class="doc-section">
      <h2>${t('migrationAngular.stepByStep')}</h2>
      <p>${t('migrationAngular.stepByStepDesc')}</p>

      <div class="migration-steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>${t('migrationAngular.step1Title')}</h3>
            <p>${t('migrationAngular.step1Desc')}</p>
            <div class="code-block">
              <pre><code>npm install pulse-js-framework</code></pre>
            </div>
          </div>
        </div>

        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>${t('migrationAngular.step2Title')}</h3>
            <p>${t('migrationAngular.step2Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>${t('migrationAngular.step3Title')}</h3>
            <p>${t('migrationAngular.step3Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3>${t('migrationAngular.step4Title')}</h3>
            <p>${t('migrationAngular.step4Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">5</div>
          <div class="step-content">
            <h3>${t('migrationAngular.step5Title')}</h3>
            <p>${t('migrationAngular.step5Desc')}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Common Gotchas -->
    <section class="doc-section">
      <h2>${t('migrationAngular.gotchas')}</h2>

      <div class="gotcha-list">
        <div class="gotcha">
          <h3>${t('migrationAngular.gotcha1Title')}</h3>
          <p>${t('migrationAngular.gotcha1Desc')}</p>
          <div class="code-block">
            <pre><code>// Angular: subscription.unsubscribe()
// Pulse: effects auto-cleanup when component unmounts

// No need for ngOnDestroy!
// Just use effect() and it handles cleanup</code></pre>
          </div>
        </div>

        <div class="gotcha">
          <h3>${t('migrationAngular.gotcha2Title')}</h3>
          <p>${t('migrationAngular.gotcha2Desc')}</p>
          <div class="code-block">
            <pre><code>// Angular: constructor(private service: Service)
// Pulse: import { store } from './store.js'

// No providers, no modules, just imports!</code></pre>
          </div>
        </div>

        <div class="gotcha">
          <h3>${t('migrationAngular.gotcha3Title')}</h3>
          <p>${t('migrationAngular.gotcha3Desc')}</p>
          <div class="code-block">
            <pre><code>// Angular: ChangeDetectorRef.detectChanges()
// Pulse: automatic! Just update the pulse

count.set(5); // UI updates automatically</code></pre>
          </div>
        </div>

        <div class="gotcha">
          <h3>${t('migrationAngular.gotcha4Title')}</h3>
          <p>${t('migrationAngular.gotcha4Desc')}</p>
          <div class="code-block">
            <pre><code>// Angular: combineLatest, switchMap, mergeMap, etc.
// Pulse: just use computed() and async/await

const result = computed(() => a.get() + b.get());

// For async:
effect(async () => {
  const data = await fetchData(id.get());
  result.set(data);
});</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Need Help -->
    <section class="doc-section help-section">
      <h2>${t('migrationAngular.needHelp')}</h2>
      <p>${t('migrationAngular.needHelpDesc')}</p>
      <div class="help-links">
        <a href="https://github.com/vincenthirtz/pulse-js-framework/discussions" target="_blank" rel="noopener noreferrer" class="help-link">
          <span class="help-icon">💬</span>
          <span>${t('migrationAngular.discussions')}</span>
        </a>
        <a href="https://github.com/vincenthirtz/pulse-js-framework/issues" target="_blank" rel="noopener noreferrer" class="help-link">
          <span class="help-icon">🐛</span>
          <span>${t('migrationAngular.issues')}</span>
        </a>
      </div>
    </section>

    <div class="next-section"></div>
  `;

  // Attach click handlers programmatically for navigation buttons
  const nextSection = page.querySelector('.next-section');
  const getStartedBtn = el('button.btn.btn-primary', t('migrationAngular.getStarted'));
  getStartedBtn.onclick = () => navigateLocale('/getting-started');
  const viewExamplesBtn = el('button.btn.btn-secondary', t('migrationAngular.viewExamples'));
  viewExamplesBtn.onclick = () => navigateLocale('/examples');
  nextSection.append(getStartedBtn, viewExamplesBtn);

  return page;
}
