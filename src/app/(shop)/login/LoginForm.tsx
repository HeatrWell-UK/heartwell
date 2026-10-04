'use client'

import { useActionState } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { signIn, type SignInState } from './actions'
import { Field, TextInput } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

const initial: SignInState = { error: null, email: '' }

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initial)

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-field)] border border-error/40 bg-error/5 px-4 py-3 text-[15px] font-semibold text-error"
        >
          <WarningCircleIcon aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
      <Field label="Email address">
        {({ id }) => (
          <TextInput id={id} name="email" type="email" autoComplete="username" inputMode="email" required defaultValue={state.email} />
        )}
      </Field>
      <Field label="Password">
        {({ id }) => <TextInput id={id} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <Button type="submit" block disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
