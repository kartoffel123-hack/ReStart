import type { ReactNode } from 'react';
import './stud-pilot.css';

type PiecePickerProps = {
    scene: ReactNode;
    children: ReactNode;
};

export function PiecePickerScreen({ scene, children }: PiecePickerProps) {
    return (
        <main className="stud-picker">
            <header className="stud-picker__header">
                <div>
                    <h1>Re-Start</h1>
                    <h2>Mechanic Manual</h2>
                    <p>LEGO Technic helicopter 30465</p>
                </div>
            </header>
            {scene && (
                <section className="stud-picker__drawing" aria-label="Assembly view">
                    {scene}
                </section>
            )}
            <section className="stud-picker__inventory" aria-labelledby="picker-heading">
                <h2 id="picker-heading" className="visually-hidden">Piece selection</h2>
                {children}
            </section>
        </main>
    );
}
