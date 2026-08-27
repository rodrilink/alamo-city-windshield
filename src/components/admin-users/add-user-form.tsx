'use client'

// USER-02/D-12: the add-admin form. Wired exactly like BookingForm.tsx's
// useActionState + react-hook-form composition, adapted for a form whose
// Server Action returns state rather than redirecting (so the bare
// `formAction(formData)` dispatch inside handleSubmit is safe here -- see
// STATE.md's carried-forward caveat: only a redirecting action needs
// startTransition, and addUserAction never calls redirect()).
//
// D-12's show-once password display: `state.generatedPassword` is rendered
// exactly once in the success subtree below, because no email delivery
// exists to send it through instead (D-08). This value MUST NOT be
// console.log'd, console.error'd, written to localStorage/sessionStorage/a
// cookie, or placed in a URL/query parameter -- a password in a URL lands in
// browser history and any access log. No analytics/tracking call exists
// anywhere in this component either.

import { useActionState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { addUserAction } from '@/lib/admin-users/admin-users-actions'
import { addUserSchema } from '@/lib/admin-users/add-user-schema'
import { ADMIN_COPY } from '@/lib/constants'
import type { AddUserActionState, AddUserFormValues } from '@/types/admin'

const INITIAL_STATE: AddUserActionState = {
    status: 'idle',
    values: { email: '', password: '', confirmPassword: '' },
}

export function AddUserForm() {
    const [state, formAction, isPending] = useActionState(addUserAction, INITIAL_STATE)

    const form = useForm<AddUserFormValues>({
        resolver: zodResolver(addUserSchema),
        defaultValues: { email: '', password: '', confirmPassword: '' },
    })

    // Server-error bridging: a server-side re-validation failure surfaces on
    // the specific field, not only as a generic banner. Safe here (unlike
    // login) since this is an authenticated admin creating an account, not
    // an anonymous caller probing for valid emails.
    useEffect(() => {
        if (state.status === 'error' && state.fieldErrors) {
            for (const [field, message] of Object.entries(state.fieldErrors)) {
                if (message && (field === 'email' || field === 'password' || field === 'confirmPassword')) {
                    form.setError(field, { type: 'server', message })
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.fieldErrors, state.status])

    function onValidSubmit(values: AddUserFormValues) {
        const formData = new FormData()
        formData.set('email', values.email)
        formData.set('password', values.password)
        formData.set('confirmPassword', values.confirmPassword)
        formAction(formData)
    }

    if (state.status === 'success') {
        return (
            <div className="space-y-4 rounded-lg border border-border bg-muted/50 p-4" data-testid="text-add-user-success">
                <p className="text-sm font-medium text-foreground">{ADMIN_COPY.passwordShownOnceNotice}</p>
                <p className="text-sm text-muted-foreground">Email: {state.values.email}</p>
                <p className="select-all rounded-md border border-input bg-background px-3 py-2 font-mono text-sm" data-testid="text-generated-password">
                    {state.generatedPassword}
                </p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Add another admin
                </Button>
            </div>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onValidSubmit)} className="max-w-sm space-y-4" noValidate data-testid="form-add-user">
                {state.status === 'error' && state.message && (
                    <p className="text-sm text-destructive" role="alert" data-testid="text-add-user-error">
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
                                    disabled={isPending}
                                    type="email"
                                    autoComplete="email"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    data-testid="input-add-user-email"
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
                                    disabled={isPending}
                                    type="password"
                                    autoComplete="new-password"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    data-testid="input-add-user-password"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm password</FormLabel>
                            <FormControl>
                                <input
                                    {...field}
                                    disabled={isPending}
                                    type="password"
                                    autoComplete="new-password"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    data-testid="input-add-user-confirm-password"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isPending} data-testid="btn-add-user-submit">
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Creating…
                        </>
                    ) : (
                        'Add admin'
                    )}
                </Button>
            </form>
        </Form>
    )
}
