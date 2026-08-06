'use client'

// D-11: the removal confirmation, composing the generated `alert-dialog`
// primitives (Base UI under the hood, not Radix -- see alert-dialog.tsx's
// `render` prop on AlertDialogCancel). The description names the actual
// target email -- never a generic, unnamed reference to the account --
// interpolated into ADMIN_COPY.removeUserConfirmBody's fixed sentence,
// mirroring BOOKING_COPY.confirmationBody's same split between a
// caller-interpolated value and a fixed trailing sentence.
//
// The confirm control submits only the target user id to `removeUserAction`
// via useActionState -- the caller's own identity is derived server-side
// inside the action itself (admin-users-actions.ts), never sent from here.
// This file imports no Supabase client of any kind: all mutation goes
// through the Server Action.

import { useActionState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { removeUserAction } from '@/lib/admin-users/admin-users-actions'
import { ADMIN_COPY } from '@/lib/constants'
import type { RemoveUserActionState } from '@/types/admin'

interface RemoveUserDialogProps {
    userId: string
    email: string
    /** Test id for the trigger button -- supplied by UserList as `btn-remove-user-${admin.id}` (D-07/USER-01). */
    triggerTestId: string
}

const INITIAL_STATE: RemoveUserActionState = { status: 'idle' }

export function RemoveUserDialog({ userId, email, triggerTestId }: RemoveUserDialogProps) {
    const [state, formAction, isPending] = useActionState(removeUserAction, INITIAL_STATE)

    return (
        <AlertDialog>
            <AlertDialogTrigger
                render={
                    <Button variant="destructive" size="sm" data-testid={triggerTestId} />
                }
            >
                Remove
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="dialog-remove-user">
                <AlertDialogHeader>
                    {/* D-11 is satisfied by the title naming the target email. The
                        description deliberately does NOT repeat "Remove {email}?" --
                        Base UI wires aria-labelledby AND aria-describedby to these two
                        nodes, so duplicating the sentence made a screen reader announce
                        it twice back to back (review WR-02). */}
                    <AlertDialogTitle>Remove {email}?</AlertDialogTitle>
                    <AlertDialogDescription>{ADMIN_COPY.removeUserConfirmBody}</AlertDialogDescription>
                </AlertDialogHeader>

                {state.status === 'error' && (
                    <p className="text-sm text-destructive" role="alert" data-testid="text-remove-user-error">
                        {state.message}
                    </p>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel data-testid="btn-cancel-remove-user">Cancel</AlertDialogCancel>
                    <form action={formAction}>
                        <input type="hidden" name="userId" value={userId} />
                        <AlertDialogAction
                            type="submit"
                            variant="destructive"
                            disabled={isPending}
                            data-testid="btn-confirm-remove-user"
                        >
                            {isPending ? 'Removing…' : 'Remove'}
                        </AlertDialogAction>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
