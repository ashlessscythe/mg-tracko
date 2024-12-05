"use client";

interface RoleSelectProps {
  userId: string;
  currentRole: string;
  onRoleChange: (formData: FormData) => Promise<void>;
}

export function RoleSelect({
  userId,
  currentRole,
  onRoleChange,
}: RoleSelectProps) {
  return (
    <form action={onRoleChange}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="w-full bg-background border border-input rounded-md px-3 py-1 text-sm"
        onChange={(e) => {
          const form = e.target.closest("form");
          if (form) form.requestSubmit();
        }}
      >
        <option value="ADMIN">Admin</option>
        <option value="CUSTOMER_SERVICE">Customer Service</option>
        <option value="WAREHOUSE">Warehouse</option>
        <option value="REPORT_RUNNER">Report Runner</option>
        <option value="PENDING">Pending</option>
      </select>
    </form>
  );
}
