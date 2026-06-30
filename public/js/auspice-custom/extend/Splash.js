import React from "react";

// Simple, clean splash component for BV-BRC.
// We intentionally ignore errorMessage so we don't render the 404 banner.

const getNumColumns = (width) => (width > 1100 ? 3 : width > 800 ? 2 : 1);

const columnListStyle = (width) => ({
  columnCount: getNumColumns(width),
  MozColumnCount: getNumColumns(width),
  WebkitColumnCount: getNumColumns(width),
  columnGap: 20,
  MozColumnGap: 20,
  WebkitColumnGap: 20
});

const Splash = ({ available, browserDimensions }) => {
  const width = (browserDimensions && browserDimensions.width) || 960;
  const datasets = (available && available.datasets) || [];
  const narratives = (available && available.narratives) || [];

  const ListAvailable = ({ label, data }) => (
    <>
      <div style={{ fontSize: 22, marginTop: 24, fontWeight: 500 }}>{label}</div>
      {data && data.length ? (
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <div style={{ flex: "1 50%", minWidth: 0 }}>
            <ul style={columnListStyle(width)}>
              {data.map((d) => (
                <li key={d.request} style={{ padding: "4px 0" }}>
                  {/* Same pattern as stock Auspice: relative href = dataset path */}
                  <a href={d.request} style={{ color: "#5097BA", textDecoration: "none" }}>
                    {d.request}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 4, color: "#777" }}>none found</p>
      )}
    </>
  );

  return (
    <div
      className="static container"
      style={{
        paddingTop: 40,
        paddingBottom: 40,
        maxWidth: 980,
        margin: "0 auto"
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            letterSpacing: "0.16rem",
            textTransform: "uppercase"
          }}
        >
          BV-BRC Nextstrain Viewer
        </h1>
        <p style={{ marginTop: 10, fontSize: 16, color: "#555" }}>
          Explore phylogenomic datasets provided via Nextstrain / Auspice.
        </p>
      </div>

      {/* We intentionally DO NOT render any 404 / error banner here */}

      <ListAvailable label="Available datasets:" data={datasets} />
      <ListAvailable label="Available narratives:" data={narratives} />
    </div>
  );
};

export default Splash;


