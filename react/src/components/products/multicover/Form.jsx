import React from "react";
import ProjectForm from "../../ProjectForm";
import { CoverForm, GENERAL_DEFAULTS, ATTRIBUTE_DEFAULTS } from "./Form";

export default function MultiCoverForm(props) {
  return (
    <ProjectForm
      ProductForm={CoverForm}
      collectionKey="covers"
      productLabel="Cover"
      generalDefaults={GENERAL_DEFAULTS}
      attributeDefaults={ATTRIBUTE_DEFAULTS}
      {...props}
    />
  );
}
