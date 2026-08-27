'use client'

// D-04/AUTH-01/AUTH-02: wired directly to the `loginAction` Server Action.
// Uses BookingForm.tsx's `Form`/`FormField` composition (react-hook-form +
// shadcn Form), NOT ContactForm.tsx's manual `register()` style -- see
// 05-PATTERNS.md's explicit "use this, not ContactForm.tsx" guidance.
//
// Deliberately does NOT feed `state` back into `useForm`'s `values` the way
// BookingForm.tsx does for D-09: a login form must never preserve a failed
// attempt's password. Leave the password field to reset naturally on
// re-render instead of replaying it.
//
// Deliberately does NOT read the URL's query string anywhere -- D-09 fixes
// the post-login destination inside `loginAction` itself; the form has no
// business carrying or reading a redirect destination.

import { useActionState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { loginAction } from '@/lib/auth/auth-actions'
import { loginSchema } from '@/lib/auth/login-schema'
import type { LoginActionState, LoginFormValues } from '@/types/auth'

const INITIAL_STATE: LoginActionState = { status: 'idle' }

export function LoginForm() {
    const [state, formAction, isActionPending] = useActionState(loginAction, INITIAL_STATE)

    // `loginAction` is the first Server Action in this repo that calls
    // `redirect()` on success. BookingForm.tsx/ContactForm.tsx dispatch
    // `formAction(formData)` bare inside `handleSubmit` -- safe for them,
    // because `createBooking`/`createContact` only return state. Dispatching
    // outside a transition here makes React unable to drive the redirect
    // through the router, producing a client-side exception on success
    // ("An async function with useActionState was called outside of a
    // transition"). Wrap the dispatch in `startTransition` so React owns the
    // navigation. Do NOT revert this to a bare `formAction(formData)` call.
    const [isTransitionPending, startTransition] = useTransition()
    const isPending = isActionPending || isTransitionPending

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    })

    // Zod's client-side resolver runs before any dispatch to the Server
    // Action -- mirrors ContactForm.tsx's/BookingForm.tsx's onValidSubmit.
    function onValidSubmit(values: LoginFormValues) {
        const formData = new FormData()
        formData.set('email', values.email)
        formData.set('password', values.password)
        startTransition(() => {
            formAction(formData)
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onValidSubmit)} className="space-y-4" noValidate data-testid="form-login">
                {state.status === 'error' && (
                    <p className="text-sm text-destructive" role="alert" data-testid="text-login-error">
                        {state.message}
                    </p>
                )}

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <input
                                    {...field}
                                    type="email"
                                    disabled={isPending}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    autoComplete="email"
                                    data-testid="input-login-email"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <input
                                    {...field}
                                    type="password"
                                    disabled={isPending}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    autoComplete="current-password"
                                    data-testid="input-login-password"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full" disabled={isPending} data-testid="btn-login-submit">
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Signing in…
                        </>
                    ) : (
                        'Sign in'
                    )}
                </Button>
            </form>
        </Form>
    )
}
