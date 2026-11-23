
'use client';
import { useEscape } from '@/hooks/useEscape';
import { useState } from 'react';
import { useGym } from '@/hooks/useGym';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ExpenseForm } from '@/components/admin/expense-form';
import { deleteExpense } from '@/firebase/firestore/expenses';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';


function ExpenseModal({ gymId, expense, isOpen, onClose }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;
    const isEditing = !!expense;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-border" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-card-foreground">
                        {isEditing ? 'Edit Expense'.replace(/ /g, "\u00A0") : 'Add New Expense'.replace(/ /g, "\u00A0")}
                    </h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <ExpenseForm gymId={gymId} expense={expense} onSuccess={onClose} />
                </div>
            </div>
        </div>
    );
}

function ExpenseRow({ expense, onEdit, onDelete }) {
    const categoryName = expense.category === 'other' ? expense.otherCategoryName : expense.category;
    return (
        <tr className="border-b border-border last:border-b-0">
            <td className="p-4 font-medium capitalize">{categoryName?.replace(/ /g, "\u00A0") || <>&nbsp;</>}</td>
            <td className="p-4 text-muted-foreground hidden md:table-cell">{expense.description?.replace(/ /g, "\u00A0") || <>&nbsp;</>}</td>
            <td className="p-4 hidden md:table-cell">{expense.date ? format(parseISO(expense.date), 'dd MMM, yyyy').replace(/ /g, "\u00A0") : <>&nbsp;</>}</td>
            <td className="p-4 font-semibold">₹{expense.amount?.toFixed(2) || '0.00'}</td>
            <td className="p-4 text-center">
                <div className="flex justify-center items-center gap-2">
                    <button aria-label="Edit expense" onClick={() => onEdit(expense)} className="p-2 rounded-full hover:bg-muted">
                        <Edit className="w-4 h-4" />
                    </button>
                     <button aria-label="Delete expense" onClick={() => onDelete(expense)} className="p-2 rounded-full hover:bg-muted text-destructive">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}


export default function ExpensesPage() {
    const firestore = useFirestore();
    const { gymId, isGymLoading } = useGym();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [deleteCandidate, setDeleteCandidate] = useState(null);

    const expensesQuery = useMemoFirebase(() => {
        if (isGymLoading || !firestore || !gymId) return null;
        return query(collection(firestore, 'gyms', gymId, 'expenses'), orderBy('date', 'desc'));
    }, [firestore, gymId, isGymLoading]);

    const { data: expenses, isLoading: isLoadingExpenses } = useCollection(expensesQuery);

    const handleAddExpense = () => {
        setSelectedExpense(null);
        setIsModalOpen(true);
    };

    const handleEditExpense = (expense) => {
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };
    
    const handleDeleteRequest = (expense) => {
        setDeleteCandidate(expense);
    }

    const confirmDelete = () => {
        if(firestore && gymId && deleteCandidate) {
            deleteExpense(firestore, gymId, deleteCandidate.id);
        }
        setDeleteCandidate(null);
    }

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedExpense(null);
    };
    
    if (isGymLoading) {
        return <div className="p-8 text-card-foreground">Loading...</div>;
    }
    
    if (!gymId) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4 text-card-foreground">{'Expense Tracker'.replace(/ /g, "\u00A0")}</h1>
                <p className="text-card-foreground">You are not currently assigned to a gym. Please contact a super administrator.</p>
            </div>
        );
    }

    const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

    return (
        <>
            <div className="p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-card-foreground">{'Expense Tracker'.replace(/ /g, "\u00A0")}</h1>
                        <p className="text-muted-foreground">Monitor all your gym's expenditures.</p>
                    </div>
                    <button
                        onClick={handleAddExpense}
                        className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg"
                    >
                        <Plus className="w-5 h-5" />
                        {'Add Expense'.replace(/ /g, "\u00A0")}
                    </button>
                </div>
                
                 <div className="bg-card text-card-foreground rounded-lg shadow-md border">
                     <div className="p-4 border-b border-border">
                        <h3 className="font-bold text-lg">{'Total Expenses'.replace(/ /g, "\u00A0")}: ₹{totalExpenses.toFixed(2)}</h3>
                    </div>
                    {isLoadingExpenses && <div className="text-center p-8 text-muted-foreground">Loading expenses...</div>}

                     {!isLoadingExpenses && (!expenses || expenses.length === 0) && (
                        <div className="text-center py-12 px-4">
                            <h3 className="text-lg font-semibold text-card-foreground">{'No Expenses Logged'.replace(/ /g, "\u00A0")}</h3>
                            <p className="text-muted-foreground mt-1">Click "Add Expense" to start tracking.</p>
                        </div>
                    )}
                    
                    {!isLoadingExpenses && expenses && expenses.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-card">
                                    <tr className="border-b border-border">
                                        <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Category'.replace(/ /g, "\u00A0")}</th>
                                        <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground hidden md:table-cell">{'Description'.replace(/ /g, "\u00A0")}</th>
                                        <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground hidden md:table-cell">{'Date'.replace(/ /g, "\u00A0")}</th>
                                        <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Amount'.replace(/ /g, "\u00A0")}</th>
                                        <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground text-center">{'Actions'.replace(/ /g, "\u00A0")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map(expense => (
                                        <ExpenseRow
                                            key={expense.id}
                                            expense={expense}
                                            onEdit={handleEditExpense}
                                            onDelete={handleDeleteRequest}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
            <ExpenseModal
                gymId={gymId}
                expense={selectedExpense}
                isOpen={isModalOpen}
                onClose={closeModal}
            />
            <ConfirmationDialog
                isOpen={!!deleteCandidate}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={confirmDelete}
                title={'Delete Expense'.replace(/ /g, "\u00A0")}
                description={`Are you sure you want to delete this expense? This action cannot be undone.`}
                confirmText="Delete"
            />
        </>
    );
}
