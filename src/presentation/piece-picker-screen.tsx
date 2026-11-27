import type { ReactNode } from 'react';
import './stud-pilot.css';

type PiecePickerProps = {
    edition: string;
    scene: ReactNode;
    viewControls: ReactNode;
    children: ReactNode;
};

export function PiecePickerScreen({ edition, scene, viewControls, children }: PiecePickerProps) {
    return (
        <main className="stud-picker">
            <header className="stud-picker__header">
                <div>
                    <p>ReStart / LEGO Technic helicopter 30465 · {edition}</p>
                    <h1>Mechanic manual</h1>
                </div>
                <a href="#/review">Inspect the repair graph</a>
            </header>
            {scene && (
                <section className="stud-picker__drawing" aria-label="Assembly view">
                    {scene}
                    <div className="stud-picker__view-controls">{viewControls}</div>
                </section>
            )}
            <section className="stud-picker__inventory" aria-labelledby="picker-heading">
                <h2 id="picker-heading">Choose a piece</h2>
                <p>Pick a piece on the helicopter or find it in the inventory.</p>
                {children}
            </section>
        </main>
    );
}
