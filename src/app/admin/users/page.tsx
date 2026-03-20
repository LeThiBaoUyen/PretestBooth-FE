"use client";

import AdminUsersPage from "../../dashboard/users/page";

export default function AdminUsersRoutePage() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<AdminUsersPage />
			</div>
		</main>
	);
}
