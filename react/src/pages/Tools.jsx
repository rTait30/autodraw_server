import React from 'react';
import ToolsCard from '../components/ToolsCard';

const Tools = () => {
    return (
        <div className="p-4 pt-[calc(var(--header-height)+1rem)] pb-[calc(var(--bottom-nav-height)+1rem)]">
             <ToolsCard defaultOpen={true} />
        </div>
    );
};

export default Tools;
