import React, { useEffect, useState } from "react";
import { getBaseUrl } from "../utils/baseUrl";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

export default function Database() {
  const [db, setDb] = useState({});
  const [active, setActive] = useState("");
  const [sql, setSql] = useState("");
  const [result, setResult] = useState("");

  const loadDatabase = () => {
    fetch(getBaseUrl("/api/database"))
      .then((res) => res.json())
      .then((data) => {
        setDb(data);
        if (!active || !data[active]) {
          setActive(Object.keys(data)[0] || "");
        }
      });
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  const runSql = async () => {
    setResult("Running...");
    try {
      const res = await fetch(getBaseUrl("/api/database/sql"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      loadDatabase(); // refresh the tables
    } catch (err) {
      setResult("Error: " + err.message);
    }
  };

  if (!Object.keys(db).length) return <p>Loading database...</p>;

  return (
    <>
    <div style={{ padding: "1rem" }}>
      <h1>Database Viewer</h1>

      <div style={{ marginBottom: 16 }}>
        {Object.keys(db).map((table) => (
          <button
            key={table}
            onClick={() => setActive(table)}
            style={{
              marginRight: 8,
              background: active === table ? "#1976d2" : "#eee",
              color: active === table ? "#fff" : "#222",
              border: "none",
              borderRadius: 4,
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            {table}
          </button>
        ))}
      </div>

      {active && db[active] && <Table data={db[active]} />}

      <div style={{ marginTop: 32 }}>
        <h2>Run SQL</h2>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="Write your SQL query here..."
          rows={5}
          style={{
            width: "100%",
            padding: "0.5rem",
            fontFamily: "monospace",
            fontSize: "1rem",
            marginBottom: "0.5rem",
          }}
        />
        <div>
          <button
            onClick={runSql}
            style={{
              backgroundColor: "#2e7d32",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Run SQL
          </button>
        </div>
        {result && (
          <pre
            style={{
              marginTop: "1rem",
              padding: "0.5rem",
              backgroundColor: "#f6f6f6",
              border: "1px solid #ccc",
              whiteSpace: "pre-wrap",
            }}
          >
            {result}
          </pre>
        )}
      </div>
    </div>
    <p style={{ marginTop: 40}}>
      -- Select all columns from a table
      SELECT * FROM table_name;
      <br />
      <br />
      -- Select specific columns
      SELECT column1, column2 FROM table_name;
      <br />
      <br />
      -- Select with filtering
      SELECT * FROM table_name WHERE condition;
      <br />
      <br />
      -- Example with ordering and limiting
      SELECT * FROM users WHERE role = 'admin' ORDER BY created_at DESC LIMIT 10;
      <br />
      <br />
      ➕ INSERT (Create Data)
      <br />
      <br />

      -- Insert a single row
      INSERT INTO table_name (column1, column2) VALUES (value1, value2);
      <br />
      <br />

      -- Example
      INSERT INTO products (sku, name, price) VALUES ('123-ABC', 'Widget', 19.99);
      <br />
      <br />

      ✏️ UPDATE (Edit Existing Data)
      <br />
      <br />

      -- Update specific rows
      UPDATE table_name SET column1 = value1, column2 = value2 WHERE condition;
      <br />
      <br />

      -- Example
      UPDATE users SET email = 'new@example.com', company = 'Acme Co' WHERE username = 'jdoe';
      <br />
      <br />

      ❌ DELETE (Remove Data)
      <br />
      <br />

      -- Delete specific rows
      DELETE FROM table_name WHERE condition;
      <br />
      <br />

      -- Example
      DELETE FROM users WHERE id = 5;
    </p>
    </>
  );
}

function Table({ data }) {
  const columns = React.useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0]).map((key) => ({
      accessorKey: key,
      header: key,
    }));
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data.length) return <p>No data in this table.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                style={{
                  textAlign: "left",
                  padding: "0.5rem",
                  borderBottom: "2px solid #ccc",
                  backgroundColor: "#f0f0f0",
                }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                style={{
                  padding: "0.5rem",
                  borderBottom: "1px solid #ddd",
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    
    
    
  );
}
