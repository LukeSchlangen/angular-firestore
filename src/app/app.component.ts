// app.component.ts
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Task = {
    id: string;
    title: string;
    status: 'IN_PROGRESS' | 'COMPLETE';
};

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [FormsModule],
    template: `
        <section>
            <input
                type="text"
                placeholder="dog"
                [(ngModel)]="animal"
                class="text-black border-2 p-2 m-2 rounded"
            />
            <button
                (click)="getTasks()"
            >
                Get New Fun Facts
            </button>
            <table>
                <tbody>
                    @for(fact of facts(); track fact) {
                        <tr>
                            <td>{{fact.title}}</td>
                            <td>{{fact.status}}</td>
                        </tr>
                    }
                </tbody>
            </table>
        </section>
    `,
    styles: '',
})
export class AppComponent {
    animal = '';
    facts = signal<Task[]>([]);
    constructor() {
        this.getTasks();
    }

    getTasks() {
        fetch(`/api/tasks`).then(response => response.json()).then(facts => {
            console.log(facts);
            this.facts.set(facts);
        });
    }
}
