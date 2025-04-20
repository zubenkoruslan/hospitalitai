import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
// import { ChakraProvider, extendTheme } from "@chakra-ui/react"; // Remove Chakra imports

// Remove theme
// const theme = extendTheme({});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* <ChakraProvider theme={theme}> */}
    <App />
    {/* </ChakraProvider> */}
  </StrictMode>
);
