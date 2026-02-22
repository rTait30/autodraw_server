import React from 'react';
import ToolsCard from '../components/ToolsCard';
import PageHeader from '../components/PageHeader';

const Tools = () => {



    return (

        <div>
            <PageHeader
                title="Tools"
                includeNav={false}
                hideBackButton={true}
            />

        <div className="p-4 mt-2 flex flex-col gap-4">
             
            <ToolsCard defaultOpen={true} />
        </div>
        
        </div>
    );
};

export default Tools;
