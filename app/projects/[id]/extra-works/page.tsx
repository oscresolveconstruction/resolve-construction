
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../src/prisma/db";
import {
  createExtraWork,
  updateExtraWork,
  deleteExtraWork,
} from "../../../actions/extra-works";

type PageProps = {
  params: Promise<{ id: string }>;
};

function money(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

function formatDate(value: unknown) {
  if (!value) return "";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 9,
  fontSize: 14,
  background: "#fff",
  color: "#111827",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: 13,
  marginBottom: 6,
  color: "#374151",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 22,
};

const buttonStyle: React.CSSProperties = {
  background: "#f97316",
  color: "#fff",
  border: "none",
  borderRadius: 9,
  padding: "11px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

export default async function ExtraWorksPage({ params }: PageProps) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    notFound();
  }

  const project = await db.orm.public.Project.first({ id: projectId });

  if (!project) {
    notFound();
  }

  const extraWorks = await db.orm.public.ExtraWork.where({
    projectId,
  }).all();

  const approvedTotal = extraWorks
    .filter((work) => work.status === "Approved")
    .reduce((sum, work) => sum + Number(work.amount), 0);

  const pendingTotal = extraWorks
    .filter((work) => work.status === "Pending")
    .reduce((sum, work) => sum + Number(work.amount), 0);

  const contractValue = Number(project.contractValue);
  const totalProjectValue = contractValue + approvedTotal;

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "30px 24px 60px",
        color: "#111827",
      }}
    >
      <Link
        href={`/projects/${projectId}`}
        style={{
          color: "#ea580c",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        ← Back to Project
      </Link>

      <div style={{ marginTop: 22, marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
          Extra Works
        </h1>

        <p style={{ color: "#6b7280", margin: 0 }}>
          {project.name} — Additional construction works
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: 26,
        }}
      >
        {[
          { label: "Original Contract", value: contractValue },
          { label: "Approved Extra Works", value: approvedTotal },
          { label: "Pending Extra Works", value: pendingTotal },
          { label: "Total Project Value", value: totalProjectValue },
        ].map((item) => (
          <div key={item.label} style={cardStyle}>
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginBottom: 10,
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: 25,
                fontWeight: 800,
                color:
                  item.label === "Total Project Value"
                    ? "#ea580c"
                    : "#111827",
              }}
            >
              {money(item.value)}
            </div>
          </div>
        ))}
      </div>

      <section style={{ ...cardStyle, marginBottom: 28 }}>
        <h2 style={{ fontSize: 21, marginTop: 0 }}>
          Add Extra Work
        </h2>

        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Register additional work requested for this project.
        </p>

        <form action={createExtraWork}>
          <input
            type="hidden"
            name="projectId"
            value={projectId}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <label htmlFor="new-title" style={labelStyle}>
                Work Title
              </label>
              <input
                id="new-title"
                name="title"
                required
                maxLength={200}
                placeholder="Additional electrical installation"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="new-amount" style={labelStyle}>
                Amount (£)
              </label>
              <input
                id="new-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="1500.00"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="new-date" style={labelStyle}>
                Date
              </label>
              <input
                id="new-date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="new-status" style={labelStyle}>
                Status
              </label>
              <select
                id="new-status"
                name="status"
                defaultValue="Pending"
                style={inputStyle}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="new-description" style={labelStyle}>
              Description
            </label>
            <textarea
              id="new-description"
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="Describe the additional work..."
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          <button type="submit" style={buttonStyle}>
            + Add Extra Work
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>
          Registered Extra Works ({extraWorks.length})
        </h2>

        {extraWorks.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              textAlign: "center",
              padding: 45,
              color: "#6b7280",
            }}
          >
            No extra works registered yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {extraWorks.map((work) => (
              <div key={work.id} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: "0 0 6px",
                        fontSize: 19,
                      }}
                    >
                      {work.title}
                    </h3>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: 20,
                        background:
                          work.status === "Approved"
                            ? "#dcfce7"
                            : work.status === "Rejected"
                              ? "#fee2e2"
                              : "#ffedd5",
                        color:
                          work.status === "Approved"
                            ? "#166534"
                            : work.status === "Rejected"
                              ? "#991b1b"
                              : "#9a3412",
                      }}
                    >
                      {work.status}
                    </span>
                  </div>

                  <strong
                    style={{
                      fontSize: 24,
                      color: "#ea580c",
                    }}
                  >
                    {money(work.amount)}
                  </strong>
                </div>

                <form action={updateExtraWork}>
                  <input
                    type="hidden"
                    name="id"
                    value={work.id}
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 14,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <label style={labelStyle}>
                        Work Title
                        <input
                          name="title"
                          defaultValue={work.title}
                          required
                          maxLength={200}
                          style={{
                            ...inputStyle,
                            marginTop: 6,
                          }}
                        />
                      </label>
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Amount (£)
                        <input
                          name="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          defaultValue={String(work.amount)}
                          style={{
                            ...inputStyle,
                            marginTop: 6,
                          }}
                        />
                      </label>
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Date
                        <input
                          name="date"
                          type="date"
                          required
                          defaultValue={formatDate(work.date)}
                          style={{
                            ...inputStyle,
                            marginTop: 6,
                          }}
                        />
                      </label>
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Status
                        <select
                          name="status"
                          defaultValue={work.status}
                          style={{
                            ...inputStyle,
                            marginTop: 6,
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>
                      Description
                      <textarea
                        name="description"
                        rows={2}
                        maxLength={2000}
                        defaultValue={work.description ?? ""}
                        style={{
                          ...inputStyle,
                          marginTop: 6,
                          resize: "vertical",
                        }}
                      />
                    </label>
                  </div>

                  <button type="submit" style={buttonStyle}>
                    Save Changes
                  </button>
                </form>

                <form
                  action={deleteExtraWork}
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <input
                    type="hidden"
                    name="id"
                    value={work.id}
                  />

                  <button
                    type="submit"
                    style={{
                      background: "transparent",
                      border: "1px solid #fecaca",
                      color: "#b91c1c",
                      borderRadius: 8,
                      padding: "9px 14px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Delete Extra Work
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
