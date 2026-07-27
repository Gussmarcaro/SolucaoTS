import { Check, X } from 'lucide-react';
import { avaliarSenha } from '@/lib/validators';
import { cn } from '@/lib/cn';

const regras: { chave: keyof ReturnType<typeof avaliarSenha>; label: string }[] = [
  { chave: 'tamanho', label: 'Mínimo de 8 caracteres' },
  { chave: 'maiuscula', label: '1 letra maiúscula' },
  { chave: 'numero', label: '1 número' },
  { chave: 'especial', label: '1 caractere especial' },
];

export function PasswordStrength({ senha }: { senha: string }) {
  const r = avaliarSenha(senha);
  return (
    <ul className="mt-2 grid grid-cols-2 gap-1.5">
      {regras.map(({ chave, label }) => {
        const ok = r[chave];
        return (
          <li
            key={chave}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400',
            )}
          >
            {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
