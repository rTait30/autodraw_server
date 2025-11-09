import React from "react";
import ProjectForm from "../../ProjectForm";
import SailForm from "../shadesail/Form";

export default function MultiShadeSailForm(props) {
  // Thin wrapper: pass SailForm as the ProductForm to the generic ProjectForm.
  return (
    <ProjectForm
      {...props}
      ProductForm={SailForm}
      collectionKey="sails"
      productLabel="Sail"
    />
  );
}
